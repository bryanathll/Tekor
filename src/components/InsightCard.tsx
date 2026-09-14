import { useState } from 'react'
import { generateInsight } from '../lib/insight'
import type { Insight } from '../lib/insight'
import type { MonthStats } from '../lib/stats'
import type { MonthKey } from '../lib/month'
import type { Expense } from '../types'

type Props = {
  month: MonthKey
  rows: Expense[]
  stats: MonthStats
}

/**
 * Kartu ringkasan bulanan. Tidak disimpan di mana pun: setiap kali halaman Dashboard
 * dibuka, kartu kembali ke tombol "Buat" dan ringkasan dibuat ulang bila diminta.
 */
export default function InsightCard({ month, rows, stats }: Props) {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setMessage('')
    const result = await generateInsight(month, rows, stats)
    setLoading(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setInsight(result.insight)
  }

  if (stats.count === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      {insight ? (
        <>
          <p className="font-semibold text-ink">{insight.headline}</p>
          <ul className="mt-3 space-y-2">
            {insight.highlights.map((line, index) => (
              <li key={index} className="flex gap-2 text-sm text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Ringkasan bulan ini</p>
            <p className="text-xs text-muted">Beberapa kalimat tentang pola pengeluaran.</p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Menyusun...' : 'Buat'}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-primary">{message}</p>}
    </div>
  )
}
