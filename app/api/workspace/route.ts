import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { listProjects, saveProject } from '@/lib/neon-persistence'
import { validateFiles } from '@/lib/workspace'

const schema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  mode: z.string().min(1).max(40),
  selectedFile: z.string().max(240).optional(),
  files: z.record(z.string(), z.string()),
})

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET() {
  const userId = await getUserId().catch(() => null)
  if (!userId) return NextResponse.json({ configured: false, authenticated: false, projects: [] })
  try {
    return NextResponse.json({ configured: true, authenticated: true, projects: await listProjects(userId) })
  } catch {
    return NextResponse.json({ configured: true, authenticated: true, error: 'Workspace storage is temporarily unavailable.' }, { status: 503 })
  }
}

export async function PUT(request: Request) {
  const userId = await getUserId().catch(() => null)
  if (!userId) return NextResponse.json({ configured: false, authenticated: false, error: 'Sign in to sync your workspace.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workspace payload.' }, { status: 400 })
  try {
    validateFiles(parsed.data.files)
    const project = await saveProject({ ...parsed.data, userId })
    return NextResponse.json({ configured: true, authenticated: true, project })
  } catch {
    return NextResponse.json({ error: 'Workspace could not be saved.' }, { status: 503 })
  }
}

export const POST = PUT
