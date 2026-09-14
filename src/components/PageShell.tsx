import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  /** Elemen di sisi kanan bilah atas, misalnya tombol aksi. */
  action?: ReactNode
  children: ReactNode
}

/** Kerangka halaman menu: bilah atas dengan tombol kembali, judul, lalu isi. */
export default function PageShell({ title, action, children }: Props) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2 py-2">
        <Link
          to="/"
          aria-label="Kembali ke beranda"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-line/60"
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-ink">{title}</h1>
        {action}
      </header>

      <div className="mt-2">{children}</div>
    </main>
  )
}
