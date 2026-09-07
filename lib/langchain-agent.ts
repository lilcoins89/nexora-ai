import { ChatGroq } from '@langchain/groq'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'
import { LIMITS, validateFiles } from '@/lib/workspace'

const modelName = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'

const FileChange = z.object({
  path: z.string().min(1),
  content: z.string().max(LIMITS.fileBytes),
  reason: z.string().max(500),
})

const Plan = z.object({
  summary: z.string(),
  steps: z.array(z.string()).max(12),
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

export async function runLangChainAgent(input: { prompt: string; mode: string; files: Record<string, string>; onEvent?: (event: string) => void }) {
  const emit = (event: string) => input.onEvent?.(event)
  const graph = new StateGraph(State)
    .addNode('inspect', async (state: AgentState) => {
      emit('LangGraph inspected workspace')
      return { events: ['Inspected workspace before planning'] }
    })
    .addNode('plan', async (state: AgentState) => {
      emit('Groq is planning the implementation')
      const planner = getModel().withStructuredOutput(Plan)
      const result = await planner.invoke([
        ['system', 'You are Nexora, a senior autonomous coding engineer. Produce only a safe, complete implementation plan and file changes. Preserve existing files unless changes are necessary. Do not include markdown fences.'],
        ['user', `Stack: ${state.mode}\nRequest: ${state.prompt}\nExisting files:\n${Object.entries(state.files).map(([path, content]) => `--- ${path} ---\n${content}`).join('\n').slice(0, 160000)}`],
      ])
      return { plan: result, events: ['Groq produced a structured implementation plan'] }
    })
    .addNode('edit', async (state: AgentState) => {
      if (!state.plan) throw new Error('The planning node did not return a plan.')
      const files = safeChanges(state.plan.changes, state.files)
      emit(`Applied ${state.plan.changes.length} planned file changes`)
      return { files, message: state.plan.summary, events: state.plan.steps.map((step) => `Plan: ${step}`) }
    })
    .addNode('validate', async (state: AgentState) => {
      validateFiles(state.files)
      emit('Validated generated workspace limits')
      return { events: ['Generated workspace passed safety validation'] }
    })
    .addEdge(START, 'inspect')
    .addEdge('inspect', 'plan')
    .addEdge('plan', 'edit')
    .addEdge('edit', 'validate')
    .addEdge('validate', END)
    .compile()

  const result = await graph.invoke({ prompt: input.prompt, mode: input.mode, files: input.files, events: [] })
  return { files: result.files, events: result.events, message: result.message ?? 'Implementation completed by the Groq LangGraph agent.', steps: result.events.length, model: modelName }
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY)
}
