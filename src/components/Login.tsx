import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { supabase } from '../lib/supabase'
import { APP_NAME, APP_TAGLINE } from '../lib/app'

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-ink placeholder:text-muted/60 ' +
  'outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMessage('Email atau kata sandi salah.')
    }

    setLoading(false)
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-cream px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        {/* Logo dan nama aplikasi */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-white"
              aria-hidden="true"
            >
              <rect x="2" y="6" width="20" height="12" rx="2.5" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              className={inputClass}
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="mt-10 text-center text-xs text-muted">Catatan pengeluaran pribadi</p>
      </div>
    </main>
  )
}
