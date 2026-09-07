import { cancelRun, getRun, listRuns, updateRun } from '@/lib/runs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  return Response.json(id ? { run: getRun(id) } : { runs: listRuns() })
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return Response.json({ error: 'Run id is required.' }, { status: 400 })
  const run = body?.status === 'cancelled' ? cancelRun(id) : updateRun(id, { status: body?.status, error: body?.error, events: Array.isArray(body?.events) ? body.events : undefined })
  if (!run) return Response.json({ error: 'Run not found.' }, { status: 404 })
  return Response.json({ run })
}
