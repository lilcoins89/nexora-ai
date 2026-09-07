export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AgentRun = { id: string; prompt: string; mode: string; status: RunStatus; createdAt: string; updatedAt: string; events: string[]; error?: string }

const globalStore = globalThis as typeof globalThis & { __nexoraRuns?: Map<string, AgentRun> }
const runs = globalStore.__nexoraRuns ?? new Map<string, AgentRun>()
globalStore.__nexoraRuns = runs

export function createRun(input: Pick<AgentRun, 'id' | 'prompt' | 'mode'>) {
  const now = new Date().toISOString()
  const run: AgentRun = { ...input, status: 'queued', createdAt: now, updatedAt: now, events: [] }
  runs.set(run.id, run)
  return run
}
export function getRun(id: string) { return runs.get(id) ?? null }
export function listRuns() { return [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50) }
export function updateRun(id: string, patch: Partial<AgentRun>) { const current = runs.get(id); if (!current) return null; const next = { ...current, ...patch, updatedAt: new Date().toISOString() }; runs.set(id, next); return next }
export function cancelRun(id: string) { return updateRun(id, { status: 'cancelled', events: [...(runs.get(id)?.events ?? []), 'Cancellation requested'] }) }
