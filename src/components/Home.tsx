import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fetchHomeData } from '../lib/expenses'
import type { HomeData } from '../lib/expenses'
import { formatRupiah, greetingByHour } from '../lib/format'
import { APP_NAME, USER_NAME } from '../lib/app'
import ExpenseForm from './ExpensesForm'
import ExpenseList from './ExpenseList'
import ReceiptScanner from './ReceiptScanner'

type Shortcut = {
  key: string
  label: string
  to: string
  icon: ReactNode
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-6 w-6',
  'aria-hidden': true,
}

/** Tiga pintu ke halaman menu. */
const SHORTCUTS: Shortcut[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <svg {...iconProps}>
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="3" height="8" rx="0.5" />
        <rect x="12" y="6" width="3" height="12" rx="0.5" />
        <rect x="17" y="13" width="3" height="5" rx="0.5" />
      </svg>
    ),
  },
  {
    key: 'categories',
    label: 'Kategori',
    to: '/kategori',
    icon: (
      <svg {...iconProps}>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
        <path d="M7.5 7.5h.01" />
      </svg>
    ),
  },
  {
    key: 'statement',
    label: 'e-Statement',
    to: '/statement',
    icon: (
      <svg {...iconProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </svg>
    ),
  },
]

export default function Home() {
  const [data, setData] = useState<HomeData>({ expenses: [], todayTotal: 0, categories: [] })

  useEffect(() => {
    let active = true

    fetchHomeData().then((result) => {
      if (active) {
        setData(result)
      }
    })

    return () => {
      active = false
    }
  }, [])

  function refresh() {
    fetchHomeData().then(setData)
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between py-2">
        <span className="text-2xl font-semibold tracking-tight text-ink">{APP_NAME}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          aria-label="Keluar"
          title="Keluar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-line/60 hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </header>

      {/* Kartu sapaan */}
      <section className="relative mt-4 overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-lg shadow-primary/25">
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-44 w-44 rounded-full bg-black/10" />

        <div className="relative">
          <p className="text-sm text-white/80">Halo, {greetingByHour()}</p>
          <h1 className="mt-0.5 text-2xl font-semibold">{USER_NAME}</h1>
        </div>

        <div className="relative mt-6 border-t border-white/15 pt-4">
          <p className="text-xs tracking-wide text-white/70 uppercase">Pengeluaran hari ini</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatRupiah(data.todayTotal)}</p>
        </div>
      </section>

      {/* Input: satu kelompok dengan kartu (info hari ini + aksi mencatat), jadi rapat */}
      <div className="mt-7 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <ExpenseForm categories={data.categories} onSaved={refresh} />
        </div>
        <ReceiptScanner categories={data.categories} onSaved={refresh} />
      </div>

      {/* Navigasi sekunder: dipisah lebih lebar dari input */}
      <nav className="mt-10 grid grid-cols-3 gap-3" aria-label="Rekap">
        {SHORTCUTS.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-2 py-4 transition hover:border-primary/40 active:scale-95"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {item.icon}
            </span>
            <span className="text-xs font-medium text-ink">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Daftar, diberi jarak lebih jauh sebagai bagian terpisah */}
      <section className="mt-14">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Catatan terakhir</h2>
          {data.expenses.length > 0 && (
            <span className="text-xs text-muted">{data.expenses.length} catatan</span>
          )}
        </div>
        <ExpenseList expenses={data.expenses} />
      </section>
    </main>
  )
}
