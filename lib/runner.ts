import { z } from 'zod'

const runnerResponse = z.object({
  ok: z.boolean(),
  status: z.enum(['passed', 'failed', 'skipped']).optional(),
  summary: z.string().optional(),
  logs: z.string().max(20000).optional(),
  errors: z.array(z.string().max(1000)).max(50).optional(),
  previewUrl: z.string().url().optional(),
})

export type RunnerResult = z.infer<typeof runnerResponse> & { configured: boolean; durationMs?: number }

function runnerUrl() {
  const value = process.env.LANGCHAIN_AGENT_URL?.trim()
  if (!value) return null
  const url = new URL(value)
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('External runner must use HTTPS in production.')
  return url
}

export async function validateWithRunner(input: { runId: string; mode: string; prompt: string; files: Record<string, string> }): Promise<RunnerResult> {
  const url = runnerUrl()
  if (!url) return { configured: false, ok: true, status: 'skipped', summary: 'External validation is not configured.' }
  const started = Date.now()
  const timeout = Math.min(Math.max(Number(process.env.LANGCHAIN_AGENT_TIMEOUT_MS || 45000), 5000), 120000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.LANGCHAIN_AGENT_TOKEN ? { authorization: `Bearer ${process.env.LANGCHAIN_AGENT_TOKEN}` } : {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: 'no-store',
    })
    const body = await response.json().catch(() => null)
    const parsed = runnerResponse.safeParse(body)
    if (!parsed.success) return { configured: true, ok: false, status: 'failed', summary: 'Runner returned an invalid response.', errors: ['Invalid runner response.'], durationMs: Date.now() - started }
    return { configured: true, ...parsed.data, ok: response.ok && parsed.data.ok, durationMs: Date.now() - started }
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'Runner timed out.' : 'Runner could not be reached.'
    return { configured: true, ok: false, status: 'failed', summary: message, errors: [message], durationMs: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}
