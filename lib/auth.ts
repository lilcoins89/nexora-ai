import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

const origin =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')

export const auth = betterAuth({
  ...(pool ? { database: pool } : {}),
  baseURL: origin,
  emailAndPassword: { enabled: true, autoSignIn: true },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
          ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
        ]
      : []),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: { sameSite: 'none' as const, secure: true },
        },
      }
    : {}),
})
