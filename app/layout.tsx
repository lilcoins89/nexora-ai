import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = process.env.BETTER_AUTH_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://nexora-ai.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Nexora — Build in conversation',
    template: '%s · Nexora',
  },
  description:
    'Mobile-first autonomous coding studio for apps, websites, APIs, prompts, and architectures. Import GitHub. Export when it is ready.',
  applicationName: 'Nexora',
  keywords: ['Nexora', 'AI coding agent', 'autonomous agent', 'mobile studio', 'LangChain'],
  authors: [{ name: 'Nexora' }],
  openGraph: {
    type: 'website',
    title: 'Nexora — Build in conversation',
    description: 'Autonomous coding studio for apps, websites, APIs, prompts, and architectures.',
    siteName: 'Nexora',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexora — Build in conversation',
    description: 'Autonomous coding studio for apps, websites, APIs, prompts, and architectures.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: '#0b0b0d',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' ? <Analytics /> : null}
      </body>
    </html>
  )
}
