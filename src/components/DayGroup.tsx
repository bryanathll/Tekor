import { useState } from 'react'
import { formatRupiah } from '../lib/format'
import type { DailyTotal } from '../lib/stats'

type Props = {
  day: DailyTotal
  label: string
  defaultOpen?: boolean
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/**
 * Satu hari dalam daftar "Total per hari". Kepala baris bisa ditekan untuk membuka
 * rincian transaksi hari itu. Animasi buka-tutup memakai grid-template-rows 0fr -> 1fr
 * supaya tingginya mengikuti isi tanpa perlu dihitung.
 */
export default function DayGroup({ day, label, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `day-${day.date}`

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream/40"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{label}</p>
          <p className="text-xs text-muted">{day.count} transaksi</p>
        </div>
        <p className="font-semibold text-ink tabular-nums">{formatRupiah(day.total)}</p>
        <ChevronIcon open={open} />
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="border-t border-line bg-cream/30">
            {day.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 py-2.5 pr-4 pl-4 not-last:border-b not-last:border-line/60"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{item.note || item.category}</p>
                  {item.note && <p className="text-xs text-muted">{item.category}</p>}
                </div>
                <p className="shrink-0 text-sm font-medium text-ink tabular-nums">
                  {formatRupiah(item.amount)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  )
}
