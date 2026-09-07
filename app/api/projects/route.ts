import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { listProjects, saveProject } from '@/lib/neon-persistence'
import { validateFiles } from '@/lib/workspace'

const projectSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  mode: z.string().min(1).max(40),
  selectedFile: z.string().max(240).optional(),
  files: z.record(z.string(), z.string()),
})

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function GET() {
  try {
    return Response.json({ projects: await listProjects(await getUserId()) })
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId()
    const parsed = projectSchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid project payload' }, { status: 400 })
    validateFiles(parsed.data.files)
    const project = await saveProject({ ...parsed.data, userId })
    return Response.json({ project })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync project'
    return Response.json({ error: message === 'Unauthorized' ? message : 'Unable to sync project' }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}
