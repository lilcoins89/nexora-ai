'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const data = new FormData(event.currentTarget)
    try {
      const result = await signIn.email({
        email: String(data.get('email')),
        password: String(data.get('password')),
      })
      if (result.error) setError('Unable to sign in. Check your details and try again.')
      else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Sign-in is not available. Configure auth and DATABASE_URL.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-card p-6"
      >
        <h1 className="text-xl font-semibold">Sign in to Nexora</h1>
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-base"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-base"
        />
        <button
          disabled={busy}
          className="min-h-12 rounded-xl bg-foreground px-4 font-medium text-background disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <a href="/sign-up" className="text-center text-sm text-muted-foreground underline">
          Create an account
        </a>
      </form>
    </main>
  )
}
