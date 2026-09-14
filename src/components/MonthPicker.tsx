import { currentMonth, isSameMonth, monthLabel, shiftMonth } from '../lib/month'
import type { MonthKey } from '../lib/month'

type Props = {
  value: MonthKey
  onChange: (month: MonthKey) => void
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  )
}

/** Pemilih bulan: panah kiri/kanan dengan label bulan di tengah. Tidak bisa melewati bulan ini. */
export default function MonthPicker({ value, onChange }: Props) {
  const atCurrentMonth = isSameMonth(value, currentMonth())

  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-2 py-1.5">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Bulan sebelumnya"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition hover:bg-line/60"
      >
        <ArrowIcon direction="left" />
      </button>

      <span className="text-sm font-semibold text-ink">{monthLabel(value)}</span>

      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={atCurrentMonth}
        aria-label="Bulan berikutnya"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition hover:bg-line/60 disabled:opacity-30"
      >
        <ArrowIcon direction="right" />
      </button>
    </div>
  )
}
