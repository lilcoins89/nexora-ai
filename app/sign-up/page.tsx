'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const data = new FormData(event.currentTarget)
    try {
      const result = await signUp.email({
        name: String(data.get('name')),
        email: String(data.get('email')),
        password: String(data.get('password')),
      })
      if (result.error) setError('Unable to create your account. Try another email.')
      else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Sign-up is not available. Configure auth and DATABASE_URL.')
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
        <h1 className="text-xl font-semibold">Create your Nexora account</h1>
        <input
          name="name"
          required
          placeholder="Name"
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-base"
        />
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
          minLength={8}
          required
          placeholder="Password"
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-base"
        />
        <button
          disabled={busy}
          className="min-h-12 rounded-xl bg-foreground px-4 font-medium text-background disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <a href="/sign-in" className="text-center text-sm text-muted-foreground underline">
          Already have an account?
        </a>
      </form>
    </main>
  )
}
