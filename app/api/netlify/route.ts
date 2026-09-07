import { createHash } from 'crypto'
import { NextResponse } from 'next/server'

const TEAM_SLUG = process.env.NETLIFY_TEAM_SLUG || 'agricoin8-debug'
const EXTENSIONS_URL = `https://app.netlify.com/teams/${TEAM_SLUG}/extensions`
const API = 'https://api.netlify.com/api/v1'

function token() {
  return process.env.NETLIFY_AUTH_TOKEN?.trim() || ''
}

function configured() {
  return Boolean(token())
}

function sha1(content: string) {
  return createHash('sha1').update(content, 'utf8').digest('hex')
}

function normalizePath(path: string) {
  const clean = path.replace(/^\/+/, '').replace(/\\/g, '/')
  if (!clean || clean.includes('..')) return null
  return `/${clean}`
}

async function netlify(path: string, init?: RequestInit) {
  const auth = token()
  if (!auth) throw new Error('NETLIFY_AUTH_TOKEN is not configured.')
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${auth}`,
      'user-agent': 'NexoraAI (nexora-ai)',
      ...(init?.headers || {}),
    },
  })
}

export async function GET() {
  if (!configured()) {
    return NextResponse.json({
      configured: false,
      team: TEAM_SLUG,
      extensionsUrl: EXTENSIONS_URL,
      message:
        'Add NETLIFY_AUTH_TOKEN to enable Netlify deploys for team agricoin8-debug. Install team extensions at the Netlify Extensions page.',
    })
  }

  try {
    const sitesResponse = await netlify(`/sites?filter=all&per_page=20`)
    if (!sitesResponse.ok) {
      return NextResponse.json(
        {
          configured: true,
          team: TEAM_SLUG,
          extensionsUrl: EXTENSIONS_URL,
          error: 'Could not list Netlify sites.',
          detail: await sitesResponse.text(),
        },
        { status: sitesResponse.status },
      )
    }
    const sites = (await sitesResponse.json()) as Array<{
      id: string
      name: string
      url: string
      admin_url: string
      account_slug?: string
    }>
    const teamSites = sites.filter((site) => !site.account_slug || site.account_slug === TEAM_SLUG)
    return NextResponse.json({
      configured: true,
      team: TEAM_SLUG,
      extensionsUrl: EXTENSIONS_URL,
      sites: teamSites.map((site) => ({
        id: site.id,
        name: site.name,
        url: site.url,
        adminUrl: site.admin_url,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Netlify status check failed.'
    return NextResponse.json({ configured: false, team: TEAM_SLUG, extensionsUrl: EXTENSIONS_URL, error: message }, { status: 502 })
  }
}

export async function POST(request: Request) {
  if (!configured()) {
    return NextResponse.json(
      {
        error: 'Netlify is not configured. Set NETLIFY_AUTH_TOKEN and optionally NETLIFY_TEAM_SLUG.',
        team: TEAM_SLUG,
        extensionsUrl: EXTENSIONS_URL,
      },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null)
  const action = body?.action === 'deploy' ? 'deploy' : null
  if (!action) {
    return NextResponse.json({ error: 'Unsupported Netlify action. Use action: "deploy".' }, { status: 400 })
  }

  const name = String(body?.name || `nexora-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 63)
  const filesInput =
    body?.files && typeof body.files === 'object' ? (body.files as Record<string, string>) : {}

  const fileMap = new Map<string, string>()
  for (const [rawPath, content] of Object.entries(filesInput)) {
    const path = normalizePath(rawPath)
    if (!path || typeof content !== 'string') continue
    fileMap.set(path, content)
  }

  if (fileMap.size === 0) {
    fileMap.set(
      '/index.html',
      `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Nexora deploy</title><style>body{font-family:system-ui,sans-serif;background:#0b0b0d;color:#e8e8ea;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:32rem;padding:2rem;border:1px solid #2a2a2e;border-radius:1.25rem;background:#121216}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#9a9aa3;line-height:1.6}</style></head><body><main><h1>Deployed with Nexora</h1><p>This site was published from the Nexora studio to Netlify team <strong>${TEAM_SLUG}</strong>.</p></main></body></html>`,
    )
  }

  try {
    const siteResponse = await netlify('/sites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        account_slug: TEAM_SLUG,
        created_via: 'nexora-ai',
      }),
    })

    if (!siteResponse.ok) {
      return NextResponse.json(
        {
          error: 'Netlify could not create the site.',
          detail: await siteResponse.text(),
          team: TEAM_SLUG,
          extensionsUrl: EXTENSIONS_URL,
        },
        { status: siteResponse.status },
      )
    }

    const site = (await siteResponse.json()) as {
      id: string
      name: string
      url: string
      admin_url: string
      ssl_url?: string
    }

    const digest: Record<string, string> = {}
    for (const [path, content] of fileMap) {
      digest[path] = sha1(content)
    }

    const deployResponse = await netlify(`/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: digest, title: 'Nexora studio deploy' }),
    })

    if (!deployResponse.ok) {
      return NextResponse.json(
        {
          error: 'Netlify could not create the deploy.',
          detail: await deployResponse.text(),
          siteUrl: site.ssl_url || site.url,
          adminUrl: site.admin_url,
        },
        { status: deployResponse.status },
      )
    }

    const deploy = (await deployResponse.json()) as {
      id: string
      required?: string[]
      ssl_url?: string
      deploy_ssl_url?: string
      state?: string
    }

    const required = new Set(deploy.required || [])
    for (const [path, content] of fileMap) {
      const hash = digest[path]
      if (required.size > 0 && !required.has(hash)) continue
      const upload = await netlify(`/deploys/${deploy.id}/files${path}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/octet-stream' },
        body: content,
      })
      if (!upload.ok) {
        return NextResponse.json(
          {
            error: `Netlify could not upload ${path}.`,
            detail: await upload.text(),
            siteUrl: site.ssl_url || site.url,
            adminUrl: site.admin_url,
            deployId: deploy.id,
          },
          { status: upload.status },
        )
      }
    }

    return NextResponse.json({
      ok: true,
      team: TEAM_SLUG,
      extensionsUrl: EXTENSIONS_URL,
      siteId: site.id,
      siteName: site.name,
      siteUrl: site.ssl_url || site.url,
      adminUrl: site.admin_url,
      deployId: deploy.id,
      deployUrl: deploy.ssl_url || deploy.deploy_ssl_url || site.ssl_url || site.url,
      files: fileMap.size,
      message: `Deployed ${fileMap.size} files to Netlify team ${TEAM_SLUG}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Netlify deploy failed.'
    return NextResponse.json({ error: message, team: TEAM_SLUG, extensionsUrl: EXTENSIONS_URL }, { status: 502 })
  }
}
