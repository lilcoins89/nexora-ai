import { gateway, stepCountIs, ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'
import { detectStackFromPrompt, stackByModeLabel, STACKS } from '@/lib/stacks'
import { LIMITS, validateFiles } from '@/lib/workspace'
import { validateWithRunner } from '@/lib/runner'

const model = gateway('openai/gpt-5.3-codex')

const fileInput = z.object({
  files: z.record(z.string(), z.string()).default({}),
})

const STACK_CATALOG = STACKS.map(
  (s) => `- ${s.title} (${s.id}): ${s.detail}. Prefer paths/extensions: ${s.extensions.join(', ')}`,
).join('\n')

function createAgent(files: Record<string, string>, events: string[], stackGuidance: string) {
  return new ToolLoopAgent({
    model,
    instructions: `You are Nexora, an autonomous coding agent inside a safe virtual workspace.

You can build and edit projects in these stacks:
${STACK_CATALOG}

Rules:
- Work in small verified increments using inspect → plan → edit → validate → summarize.
- Inspect the workspace with list_files / read_file before changing it.
- After edits, prefer a validation pass and repair clear failures before summarizing.
- Use write_file for complete file contents; use propose_patch for focused diffs when a full rewrite is risky.
- Never claim a real GitHub push, Netlify deploy, or production release happened unless the user tools did it outside this loop.
- Prefer accessible UI, mobile-first layouts, secure server boundaries, and production-ready defaults.
- Match the requested stack's conventions (file layout, config files, package manager metadata).
- When scaffolding a new stack, write the essential config files (package.json, tsconfig, pyproject, vite.config, etc.).
- Supported languages and frameworks: TypeScript, Python, React, Next.js (App Router), Vite, Vue 3.

Current stack guidance:
${stackGuidance}`,
    stopWhen: stepCountIs(10),
    tools: {
      list_files: tool({
        description: 'List every file currently available in the virtual workspace.',
        inputSchema: z.object({}),
        execute: async () => {
          events.push('Inspected workspace files')
          return { files: Object.keys(files) }
        },
      }),
      read_file: tool({
        description: 'Read a file from the virtual workspace before editing it.',
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path }) => {
          events.push(`Read ${path}`)
          return { path, content: files[path] ?? null }
        },
      }),
      write_file: tool({
        description:
          'Write a complete file into the virtual workspace. Safe relative paths only. Use for .ts, .tsx, .py, .vue, .css, configs, etc.',
        inputSchema: z.object({ path: z.string(), content: z.string().max(120000) }),
        execute: async ({ path, content }) => {
          if (path.startsWith('/') || path.includes('..')) {
            return { ok: false, error: 'Only safe relative paths are allowed.' }
          }
          files[path] = content
          events.push(`Updated ${path}`)
          return { ok: true, path, bytes: content.length }
        },
      }),
      propose_patch: tool({
        description: 'Describe a focused patch when a complete file rewrite would be unsafe or too large.',
        inputSchema: z.object({ path: z.string(), summary: z.string(), diff: z.string() }),
        execute: async ({ path, summary, diff }) => {
          events.push(`Prepared patch for ${path}`)
          return { ok: true, path, summary, diff }
        },
      }),
      scaffold_stack: tool({
        description:
          'Seed standard starter files for a stack: typescript | python | react | nextjs | vite | vue. Overwrites only missing files unless force is true.',
        inputSchema: z.object({
          stack: z.enum(['typescript', 'python', 'react', 'nextjs', 'vite', 'vue']),
          force: z.boolean().optional(),
        }),
        execute: async ({ stack, force }) => {
          const meta = STACKS.find((s) => s.id === stack)
          if (!meta) return { ok: false, error: 'Unknown stack' }
          const written: string[] = []
          for (const [path, content] of Object.entries(meta.seed)) {
            if (!force && files[path]) continue
            files[path] = content
            written.push(path)
          }
          events.push(`Scaffolded ${stack}: ${written.join(', ') || 'no new files'}`)
          return { ok: true, stack, written }
        },
      }),
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  const mode = typeof body?.mode === 'string' ? body.mode : 'Next.js'
  const parsed = fileInput.safeParse({ files: body?.files ?? {} })

  if (!prompt) {
    return Response.json({ error: 'A prompt is required.' }, { status: 400 })
  }
  if (prompt.length > LIMITS.prompt) {
    return Response.json({ error: `Prompt is too long. Keep requests under ${LIMITS.prompt} characters.` }, { status: 400 })
  }
  if (!parsed.success) {
    return Response.json({ error: 'Workspace files are invalid.' }, { status: 400 })
  }
  try { validateFiles(parsed.data.files) } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Workspace files are invalid.' }, { status: 400 })
  }

  const stack = stackByModeLabel(mode) || detectStackFromPrompt(prompt)
  const stackGuidance = stack
    ? `${stack.title}: ${stack.guidance}`
    : 'No single stack forced. Infer the best stack from the user request among TypeScript, Python, React, Next.js, Vite, and Vue.'

  const events: string[] = []
  const files = { ...parsed.data.files }

  try {
    const agent = createAgent(files, events, stackGuidance)
    const result = await agent.generate({
      prompt: `Build request (mode: ${mode}${stack ? `, stack: ${stack.id}` : ''}): ${prompt}`,
    })

    const runId = crypto.randomUUID()
    const validation = await validateWithRunner({ runId, mode, prompt, files })
    events.push(validation.configured ? `Validation ${validation.status}` : 'Validation skipped: no runner configured')

    return Response.json({
      configured: true,
      runId,
      message: result.text,
      files,
      events,
      steps: result.steps.length,
      stack: stack?.id ?? null,
      validation,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The autonomous agent could not complete this run.'
    const friendly = /api key|unauthorized|billing|gateway/i.test(message)
      ? 'AI is not configured for this deployment. Add Vercel AI Gateway credentials and try again.'
      : message
    return Response.json({ configured: false, error: friendly, events }, { status: 502 })
  }
}
