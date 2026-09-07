import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.DATABASE_URL),
    message: process.env.DATABASE_URL
      ? 'Database adapter ready to connect.'
      : 'Add DATABASE_URL to persist workspaces across devices.',
  })
}

export async function POST(request: Request) {
  const workspace = await request.json().catch(() => null)
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace payload is required.' }, { status: 400 })
  }
  return NextResponse.json({
    configured: Boolean(process.env.DATABASE_URL),
    workspace,
    message: process.env.DATABASE_URL
      ? 'Workspace accepted by the persistence seam.'
      : 'Workspace is valid locally. Add DATABASE_URL for durable persistence.',
  })
}
