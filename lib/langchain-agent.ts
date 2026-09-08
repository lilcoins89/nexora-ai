import { ChatGroq } from '@langchain/groq'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'
import { LIMITS, validateFiles } from '@/lib/workspace'

const modelName = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b'
const maxSteps = Math.min(Math.max(Number(process.env.AGENT_MAX_STEPS ?? 8), 4), 12)
const maxRepairs = Math.min(Math.max(Number(process.env.AGENT_MAX_REPAIRS ?? 1), 0), 2)

const FileChange = z.object({
  path: z.string().min(1).max(240),
  content: z.string().max(LIMITS.fileBytes),
  reason: z.string().max(500),
})

const Plan = z.object({
  summary: z.string().min(1).max(2000),
  steps: z.array(z.string().min(1).max(400)).max(12),
  changes: z.array(FileChange).max(40),
})

type AgentState = {
  prompt: string
  mode: string
  files: Record<string, string>
  events: string[]
  plan?: z.infer<typeof Plan>
  message?: string
}

const State = Annotation.Root({
  prompt: Annotation<string>,
  mode: Annotation<string>,
  files: Annotation<Record<string, string>>, 
  events: Annotation<string[]>({ reducer: (left, right) => left.concat(right), default: () => [] }),
  plan: Annotation<z.infer<typeof Plan> | undefined>,
  message: Annotation<string | undefined>,
})

function getModel() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.')
  return new ChatGroq({ model: modelName, temperature: 0.1, maxTokens: 12000 })
}

function safeChanges(changes: z.infer<typeof Plan>['changes'], files: Record<string, string>) {
  const next = { ...files }
  for (const change of changes) {
    if (!change.path.startsWith('/') && !change.path.includes('..') && !change.path.includes('\\')) next[change.path] = change.content
  }
  validateFiles(next)
  return next
}

function workspaceContext(files: Record<string, string>) {
  return Object.entries(files)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join('\n')
    .slice(0, 160000)
}

export async function runLangChainAgent(input: { prompt: string; mode: string; files: Record<string, string>; signal?: AbortSignal; onEvent?: (event: string) => void }) {
  const emit = (event: string) => input.onEvent?.(event)
  const assertRunning = () => {
    if (input.signal?.aborted) throw new Error('Agent run cancelled.')
  }
  const graph = new StateGraph(State)
    .addNode('inspect', async (state: AgentState) => {
      assertRunning()
      emit(`Inspecting ${Object.keys(state.files).length} workspace files`)
      return { events: [`Inspected workspace before planning (${Object.keys(state.files).length} files)`] }
    })
    .addNode('design', async (state: AgentState) => {
      assertRunning()
      emit(`Groq is planning the ${state.mode} implementation`)
      const planner = getModel().withStructuredOutput(Plan)
      const result = await planner.invoke([
        ['system', `You are Nexora, a senior autonomous coding engineer. Build real websites and development projects, not explanations. Return a complete safe implementation plan and file changes. Use the requested stack conventions, preserve working files, include configs and dependencies when needed, and make the result runnable. Never include markdown fences, secrets, binary data, or shell commands that execute untrusted code. Maximum repair budget: ${maxRepairs}.`],
        ['user', `Stack: ${state.mode}\nRequest: ${state.prompt}\nExisting files:\n${workspaceContext(state.files)}`],
      ])
      return { plan: result, events: [`Groq produced ${result.changes.length} file changes and ${result.steps.length} implementation steps`] }
    })
    .addNode('edit', async (state: AgentState) => {
      assertRunning()
      if (!state.plan) throw new Error('The planning node did not return a plan.')
      const files = safeChanges(state.plan.changes, state.files)
      emit(`Applied ${state.plan.changes.length} planned file changes`)
      return { files, message: state.plan.summary, events: ['Applied safe file changes', ...state.plan.steps.map((step) => `Plan: ${step}`)] }
    })
    .addNode('validate', async (state: AgentState) => {
      assertRunning()
      validateFiles(state.files)
      emit(`Validated ${Object.keys(state.files).length} generated files`)
      return { events: ['Generated workspace passed safety validation'] }
    })
    .addEdge(START, 'inspect')
    .addEdge('inspect', 'design')
    .addEdge('design', 'edit')
    .addEdge('edit', 'validate')
    .addEdge('validate', END)
    .compile()

  assertRunning()
  const result = await graph.invoke({ prompt: input.prompt, mode: input.mode, files: input.files, events: [] }, { recursionLimit: maxSteps })
  return { files: result.files, events: result.events, message: result.message ?? 'Implementation completed by the Groq LangGraph agent.', steps: result.events.length, model: modelName, brain: 'groq', framework: 'langgraph', maxSteps, maxRepairs }
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY)
}
