import { useState } from 'react'
import { generateInsight, readCachedInsight } from '../lib/insight'
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
 * Kartu ringkasan bulanan. Bila sudah pernah dibuat untuk data yang sama, langsung tampil
 * dari penyimpanan perangkat tanpa memanggil Gemini lagi.
 */
export default function InsightCard({ month, rows, stats }: Props) {
  const cached = readCachedInsight(month, stats)
  const [insight, setInsight] = useState<Insight | null>(cached)
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

  // Tampilkan ringkasan tersimpan bila cocok dengan data saat ini; kalau data berubah, minta dibuat ulang.
  const shown = insight && readCachedInsight(month, stats) ? insight : null

  if (stats.count === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      {shown ? (
        <>
          <p className="font-semibold text-ink">{shown.headline}</p>
          <ul className="mt-3 space-y-2">
            {shown.highlights.map((line, index) => (
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
            <p className="text-xs text-muted">
              {insight ? 'Data berubah sejak ringkasan terakhir.' : 'Beberapa kalimat tentang pola pengeluaran.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Menyusun...' : insight ? 'Perbarui' : 'Buat'}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-primary">{message}</p>}
    </div>
  )
}
