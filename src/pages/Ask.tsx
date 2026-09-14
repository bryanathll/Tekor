import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import PageShell from '../components/PageShell'
import ExpenseList from '../components/ExpenseList'
import { askQuestion, summarizeAnswer } from '../lib/ask'
import type { AskResult } from '../lib/ask'
import { fetchCategories } from '../lib/categories'
import { formatRupiah, formatShortDate } from '../lib/format'
import type { Category } from '../types'

const EXAMPLES = [
  'habis berapa buat kopi bulan ini?',
  'berapa kali gofood minggu ini?',
  'pengeluaran terbesar bulan lalu apa?',
  'total transport sejak tanggal 1?',
]

export default function Ask() {
  const [categories, setCategories] = useState<Category[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)

  useEffect(() => {
    let active = true
    fetchCategories().then((rows) => {
      if (active) setCategories(rows)
    })
    return () => {
      active = false
    }
  }, [])

  async function submit(text: string) {
    const trimmed = text.trim()
    if (trimmed === '' || asking) return

    setQuestion(trimmed)
    setAsking(true)
    setResult(null)
    setResult(await askQuestion(trimmed, categories))
    setAsking(false)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(question)
  }

  const answer =
    result?.ok ? summarizeAnswer(result.filter, result.rows, formatRupiah, formatShortDate) : null

  return (
    <PageShell title="Tanya">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center rounded-xl border border-line bg-surface pl-4 pr-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Contoh: habis berapa buat kopi bulan ini?"
            disabled={asking}
            enterKeyHint="search"
            maxLength={300}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-ink outline-none placeholder:text-muted/60"
          />
          <button
            type="submit"
            disabled={asking || question.trim() === ''}
            className="ml-2 h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-40"
          >
            {asking ? '...' : 'Cari'}
          </button>
        </div>
      </form>

      {!result && !asking && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Contoh pertanyaan</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => submit(example)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition hover:border-primary/40"
              >
                {example}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Gemini hanya menerjemahkan pertanyaan menjadi filter (kategori, kata, rentang tanggal).
            Angka dihitung aplikasi dari data Anda, tidak dikirim ke mana pun.
          </p>
        </div>
      )}

      {asking && <p className="mt-5 text-sm text-muted">Mencari...</p>}

      {result && !result.ok && (
        <p className="mt-5 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{result.message}</p>
      )}

      {result?.ok && answer && (
        <div className="mt-5">
          <div className="rounded-xl border border-line bg-surface px-4 py-4">
            <p className="text-2xl font-bold text-ink tabular-nums">{answer.headline}</p>
            <p className="mt-1 text-xs text-muted">{answer.detail}</p>
          </div>

          {result.rows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
                Transaksi yang cocok
              </p>
              <ExpenseList expenses={result.rows.slice(0, 50)} />
              {result.rows.length > 50 && (
                <p className="mt-2 text-xs text-muted">Menampilkan 50 dari {result.rows.length}.</p>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
