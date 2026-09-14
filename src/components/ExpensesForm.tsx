import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { supabase } from '../lib/supabase'
import { parseExpense } from '../lib/parser'
import type { ParsedExpense } from '../lib/parser'
import { parseWithGemini } from '../lib/gemini'
import { formatRupiah } from '../lib/format'
import type { Category, ExpenseInput } from '../types'

type Props = {
  categories: Category[]
  onSaved: () => void
}

type Status = 'idle' | 'parsing' | 'saving'

/**
 * Mengambil hanya kolom yang ada di tabel. Penanda `confident` tidak ikut dikirim
 * karena tabel tidak memiliki kolom tersebut.
 */
function toInput({ amount, category, note, type }: ParsedExpense): ExpenseInput {
  return { amount, category, note, type }
}

/**
 * Parser hybrid:
 * 1. Parser aturan dijalankan lebih dulu (instan, tanpa biaya).
 * 2. Bila hasilnya yakin, langsung dipakai.
 * 3. Bila tidak ada hasil atau tidak yakin, minta bantuan Gemini.
 * 4. Bila Gemini juga tidak menemukan apa pun, pakai hasil parser aturan bila ada.
 */
async function resolveItems(text: string, categories: Category[]): Promise<ExpenseInput[]> {
  const parsed = parseExpense(text, categories)

  if (parsed && parsed.confident) {
    return [toInput(parsed)]
  }

  const fromGemini = await parseWithGemini(text, categories)

  if (fromGemini.length > 0) {
    return fromGemini
  }

  return parsed ? [toInput(parsed)] : []
}

function buildSuccessMessage(items: ExpenseInput[]): string {
  if (items.length === 1) {
    const [item] = items
    const label = item.type === 'income' ? 'Pemasukan tersimpan' : 'Tersimpan'
    return `${label}: ${formatRupiah(item.amount)} pada kategori ${item.category}`
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const details = items
    .map((item) => `${item.category} ${formatRupiah(item.amount)}`)
    .join(', ')

  return `Tersimpan ${items.length} catatan (${details}). Total ${formatRupiah(total)}`
}

function SendIcon() {
  return (
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
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9z" />
    </svg>
  )
}

function Spinner() {
  return (
    <span
      className="block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  )
}

export default function ExpenseForm({ categories, onSaved }: Props) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  const busy = status !== 'idle'
  const canSubmit = !busy && text.trim() !== ''

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    setStatus('parsing')
    setMessage('')

    const items = await resolveItems(text, categories)

    if (items.length === 0) {
      setStatus('idle')
      setIsError(true)
      setMessage('Jumlah tidak terbaca. Contoh penulisan: makan siang 25rb')
      return
    }

    setStatus('saving')

    const { error } = await supabase.from('expenses').insert(items)

    setStatus('idle')

    if (error) {
      setIsError(true)
      setMessage('Gagal menyimpan. Periksa koneksi internet, lalu coba lagi.')
      return
    }

    setIsError(false)
    setMessage(buildSuccessMessage(items))
    setText('')
    onSaved()
  }

  const buttonLabel =
    status === 'parsing' ? 'Membaca kalimat' : status === 'saving' ? 'Menyimpan' : 'Catat'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Kolom input dengan tombol kirim menempel di sisi kanan */}
      <div className="flex items-center rounded-xl border border-line bg-surface pl-4 pr-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Catat pengeluran & penghasilan"
          disabled={busy}
          enterKeyHint="send"
          className="min-w-0 text-sm flex-1 bg-transparent py-3.5 text-ink outline-none placeholder:text-muted/60 disabled:text-muted"
        />
        <span className="mx-2 h-6 w-px bg-line" aria-hidden="true" />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={buttonLabel}
          title={buttonLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-dark active:scale-95 disabled:opacity-40"
        >
          {busy ? <Spinner /> : <SendIcon />}
        </button>
      </div>

      {message && (
        <p
          className={
            isError
              ? 'rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary'
              : 'rounded-xl bg-surface px-4 py-3 text-sm text-ink'
          }
        >
          {message}
        </p>
      )}
    </form>
  )
}
