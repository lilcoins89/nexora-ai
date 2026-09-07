# Nexora AI

Mobile-first autonomous build studio for apps, websites, APIs, prompts, and architectures.

**Public repo:** https://github.com/lilcoins89/nexora-ai

## Features

- Responsive landing page and full studio workspace
- Chat composer with Enter-to-send and IME-safe handling
- Virtual workspace with list / read / write tools
- Session-persisted workspace in the browser
- Mobile navigation: Build, Files, Activity, More
- Local workspace export (download)
- GitHub connect + publish flow (auth required)
- **Netlify deploy** for team `agricoin8-debug` (create site + file digest deploy)
- AI SDK tool-loop agent via Vercel AI Gateway

## Stack

- Next.js 16 + React 19
- Tailwind CSS v4
- Vercel AI SDK (`ToolLoopAgent`)
- Better Auth (email/password)
- Optional Postgres (`DATABASE_URL`) for durable sessions
- Netlify REST API for publish-to-hosting

## Quick start

```bash
git clone https://github.com/lilcoins89/nexora-ai.git
cd nexora-ai
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` and fill values for production:

| Variable | Required | Purpose |
|---|---|---|
| `AI_GATEWAY_API_KEY` / Vercel AI Gateway | For agent turns | Model access through the AI SDK gateway |
| `DATABASE_URL` | Optional | Postgres for Better Auth + durable workspace |
| `BETTER_AUTH_SECRET` | Production auth | Session signing |
| `BETTER_AUTH_URL` | Production auth | Canonical site URL |
| `NETLIFY_AUTH_TOKEN` | Netlify deploys | Personal access token |
| `NETLIFY_TEAM_SLUG` | Netlify deploys | Defaults to `agricoin8-debug` |
| Vercel Connect GitHub connector | Optional | Import / publish repos |

### Netlify setup (team agricoin8-debug)

1. Create a personal access token: [Netlify applications](https://app.netlify.com/user/applications#personal-access-tokens)
2. Set `NETLIFY_AUTH_TOKEN` in your environment
3. Confirm team slug `NETLIFY_TEAM_SLUG=agricoin8-debug`
4. Install or review team extensions: [Extensions](https://app.netlify.com/teams/agricoin8-debug/extensions)

API surface:

- `GET /api/netlify` — configuration status + recent sites
- `POST /api/netlify` with `{ action: "deploy", name?, files? }` — create a site on the team and deploy workspace files

Without a token, the UI still loads; deploys return a clear configuration error and link to the team extensions page.

## API

- `POST /api/agent` — autonomous tool-loop agent
- `GET|POST /api/workspace` — workspace persistence seam
- `GET|POST /api/github` — GitHub OAuth + publish (requires signed-in user)
- `GET|POST /api/netlify` — Netlify status + deploy for team `agricoin8-debug`
- `GET|POST /api/auth/*` — Better Auth handlers

## Deploy on Vercel

1. Import `lilcoins89/nexora-ai`
2. Add environment variables from `.env.example`
3. Enable AI Gateway (or set a compatible provider key)
4. Optionally set `NETLIFY_AUTH_TOKEN` for one-click Netlify publishes
5. Deploy

```bash
pnpm build
pnpm start
```

## Design

Near-black canvas, restrained gray surfaces, editorial serif display type, large touch targets, and mobile-first patterns for iOS Safari and Android browsers.

Figma reference: [Nexora Mobile Agent Studio](https://www.figma.com/design/p45qpQ4qIRpnkdbNbzG3Ln)

## License

MIT
