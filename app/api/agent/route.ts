import { gateway, stepCountIs, ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'

const model = gateway('openai/gpt-5.3-codex')

const fileInput = z.object({
  files: z.record(z.string(), z.string()).default({}),
})

function createAgent(files: Record<string, string>, events: string[]) {
  return new ToolLoopAgent({
    model,
    instructions: `You are Nexora, an autonomous coding agent inside a safe virtual workspace. Work in small verified increments. Inspect the workspace before changing it. Use write_file when you have a complete file, then summarize what changed. Never claim a real GitHub push or deployment happened. Existing workspace files are provided through tools. Prefer TypeScript, accessible UI, mobile-first layouts, and secure server-side boundaries.`,
    stopWhen: stepCountIs(8),
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
        description: 'Write a complete file into the virtual workspace. Use only safe relative paths.',
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
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  const mode = typeof body?.mode === 'string' ? body.mode : 'Apps & websites'
  const parsed = fileInput.safeParse({ files: body?.files ?? {} })

  if (!prompt) {
    return Response.json({ error: 'A prompt is required.' }, { status: 400 })
  }
  if (prompt.length > 8000) {
    return Response.json({ error: 'Prompt is too long. Keep requests under 8,000 characters.' }, { status: 400 })
  }
  if (!parsed.success) {
    return Response.json({ error: 'Workspace files are invalid.' }, { status: 400 })
  }

  const events: string[] = []
  const files = { ...parsed.data.files }

  try {
    const agent = createAgent(files, events)
    const result = await agent.generate({
      prompt: `Build request (${mode}): ${prompt}`,
    })

    return Response.json({
      configured: true,
      message: result.text,
      files,
      events,
      steps: result.steps.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The autonomous agent could not complete this run.'
    const friendly = /api key|unauthorized|billing|gateway/i.test(message)
      ? 'AI is not configured for this deployment. Add Vercel AI Gateway credentials and try again.'
      : message
    return Response.json({ configured: false, error: friendly, events }, { status: 502 })
  }
}
