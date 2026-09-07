import { getToken, startAuthorization } from '@vercel/connect'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const connector = 'github/nexora-github-publishing'

async function getUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user ?? null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  try {
    const callbackUrl = new URL('/api/github', request.url).toString()
    const { url } = await startAuthorization(
      connector,
      { subject: { type: 'user', id: user.id } },
      { callbackUrl },
    )
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub connect is not configured.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (body?.action !== 'publish') {
    return NextResponse.json({ error: 'Unsupported GitHub action.' }, { status: 400 })
  }
  const name = String(body.name || 'nexora-project')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .slice(0, 80)
  const files =
    body.files && typeof body.files === 'object' ? (body.files as Record<string, string>) : {}
  try {
    const token = await getToken(connector, { subject: { type: 'user', id: user.id } })
    const github = async (path: string, init?: RequestInit) =>
      fetch(`https://api.github.com${path}`, {
        ...init,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'x-github-api-version': '2022-11-28',
          ...(init?.headers || {}),
        },
      })
    const repoResponse = await github('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: 'Built with Nexora AI',
        private: false,
        auto_init: true,
      }),
    })
    if (!repoResponse.ok) {
      return NextResponse.json(
        { error: 'GitHub could not create the repository.', detail: await repoResponse.text() },
        { status: repoResponse.status },
      )
    }
    const repo = (await repoResponse.json()) as {
      owner: { login: string }
      name: string
      html_url: string
    }
    for (const [path, content] of Object.entries(files)) {
      const response = await github(
        `/repos/${repo.owner.login}/${repo.name}/contents/${path.replace(/^\//, '')}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message: `Add ${path}`,
            content: Buffer.from(content).toString('base64'),
          }),
        },
      )
      if (!response.ok) {
        return NextResponse.json(
          { error: `GitHub could not push ${path}.`, repositoryUrl: repo.html_url },
          { status: response.status },
        )
      }
    }
    return NextResponse.json({
      repositoryUrl: repo.html_url,
      name: repo.name,
      files: Object.keys(files).length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub publishing failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
