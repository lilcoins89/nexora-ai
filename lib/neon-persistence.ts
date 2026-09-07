import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { nexoraProjects, nexoraRuns } from '@/lib/db/schema'
import type { AgentRun } from '@/lib/runs'

export function isNeonConfigured() {
  return Boolean(db)
}

export async function saveProject(input: { id: string; userId: string; name: string; mode: string; selectedFile?: string; files: Record<string, string> }) {
  if (!db) return null
  const [project] = await db.insert(nexoraProjects).values({ ...input }).onConflictDoUpdate({ target: nexoraProjects.id, set: { ...input, updatedAt: new Date() } }).returning()
  return project
}

export async function listProjects(userId: string) {
  if (!db) return []
  return db.select().from(nexoraProjects).where(eq(nexoraProjects.userId, userId)).orderBy(desc(nexoraProjects.updatedAt))
}

export async function saveRun(run: AgentRun, userId: string, result?: Record<string, unknown>) {
  if (!db) return null
  const [saved] = await db.insert(nexoraRuns).values({ id: run.id, userId, projectId: null, prompt: run.prompt, mode: run.mode, status: run.status, events: run.events, error: run.error, result }).onConflictDoUpdate({ target: nexoraRuns.id, set: { status: run.status, events: run.events, error: run.error, result, updatedAt: new Date() } }).returning()
  return saved
}

export async function listRunsForUser(userId: string) {
  if (!db) return []
  return db.select().from(nexoraRuns).where(eq(nexoraRuns.userId, userId)).orderBy(desc(nexoraRuns.createdAt)).limit(50)
}
