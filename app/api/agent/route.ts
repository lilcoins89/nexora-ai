import { headers } from 'next/headers'
import { z } from 'zod'
import { detectStackFromPrompt, stackByModeLabel } from '@/lib/stacks'
import { LIMITS, validateFiles } from '@/lib/workspace'
import { validateWithRunner } from '@/lib/runner'
import { isGroqConfigured, runLangChainAgent } from '@/lib/langchain-agent'
import { createRun, updateRun } from '@/lib/runs'
import { auth } from '@/lib/auth'
import { saveRun } from '@/lib/neon-persistence'

const fileInput = z.object({
  files: z.record(z.string(), z.string()).default({}),
})

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
  const events: string[] = []
  const files = { ...parsed.data.files }
  const runId = crypto.randomUUID()
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const run = createRun({ id: runId, prompt, mode })
  if (session?.user) await saveRun(run, session.user.id)

  if (!isGroqConfigured()) {
    const error = 'Groq is not configured. Add GROQ_API_KEY to the server environment.'
    updateRun(runId, { status: 'failed', error })
    return Response.json({ configured: false, runId, error, events }, { status: 503 })
  }

  try {
    updateRun(runId, { status: 'running' })
    const result = await runLangChainAgent({
      prompt: `Build request (mode: ${mode}${stack ? `, stack: ${stack.id}` : ''}): ${prompt}`,
      mode,
      files,
      onEvent: (event) => { events.push(event); updateRun(runId, { events: [...events] }) },
    })
    const validation = await validateWithRunner({ runId, mode, prompt, files: result.files })
    events.push(validation.configured ? `Validation ${validation.status}` : 'Validation skipped: no runner configured')
    const updatedRun = updateRun(runId, { status: validation.ok ? 'completed' : 'failed', events: [...events], error: validation.ok ? undefined : validation.summary })
    if (session?.user && updatedRun) await saveRun(updatedRun, session.user.id, { files: result.files, validation })

    return Response.json({
      configured: true,
      provider: 'groq',
      framework: 'langgraph',
      runId,
      message: result.message,
      files: result.files,
      events: [...events, ...result.events],
      steps: result.steps,
      model: result.model,
      brain: result.brain,
      limits: { maxSteps: result.maxSteps, maxRepairs: result.maxRepairs },
      stack: stack?.id ?? null,
      validation,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The autonomous agent could not complete this run.'
    const friendly = /api key|unauthorized|billing|groq/i.test(message)
      ? 'Groq is not configured for this deployment. Add GROQ_API_KEY and try again.'
      : message
    updateRun(runId, { status: 'failed', events: [...events], error: friendly })
    return Response.json({ configured: false, runId, error: friendly, events }, { status: 502 })
  }
}
