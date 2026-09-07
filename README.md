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
- AI SDK tool-loop agent via Vercel AI Gateway

## Stack

- Next.js 16 + React 19
- Tailwind CSS v4
- Vercel AI SDK (`ToolLoopAgent`)
- Better Auth (email/password)
- Optional Postgres (`DATABASE_URL`) for durable sessions

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
| Vercel Connect GitHub connector | Optional | Import / publish repos |

Without gateway credentials, the UI still loads; agent calls return a clear configuration error instead of crashing.

## API

- `POST /api/agent` — autonomous tool-loop agent
- `GET|POST /api/workspace` — workspace persistence seam
- `GET|POST /api/github` — GitHub OAuth + publish (requires signed-in user)
- `GET|POST /api/auth/*` — Better Auth handlers

## Deploy on Vercel

1. Import `lilcoins89/nexora-ai`
2. Add environment variables from `.env.example`
3. Enable AI Gateway (or set a compatible provider key)
4. Deploy

```bash
pnpm build
pnpm start
```

## Design

Near-black canvas, restrained gray surfaces, editorial serif display type, large touch targets, and mobile-first patterns for iOS Safari and Android browsers.

Figma reference: [Nexora Mobile Agent Studio](https://www.figma.com/design/p45qpQ4qIRpnkdbNbzG3Ln)

## License

MIT
