import { useRef, useState } from 'react'
import type { ChangeEvent, SubmitEvent } from 'react'
import { supabase } from '../lib/supabase'
import { scanReceipt } from '../lib/receipt'
import { formatRupiah, todayIsoDate } from '../lib/format'
import { INCOME_CATEGORY } from '../lib/categories'
import type { Category, ExpenseInput, ReceiptDraft } from '../types'

type Props = {
  categories: Category[]
  onSaved: () => void
}

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted/60 ' +
  'outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15'

function CameraIcon() {
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
      <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

type DraftFormProps = {
  draft: ReceiptDraft
  categories: Category[]
  onCancel: () => void
  onSaved: () => void
}

/** Lembar persetujuan: hasil bacaan Gemini bisa dikoreksi sebelum disimpan. */
function DraftForm({ draft, categories, onCancel, onSaved }: DraftFormProps) {
  const [amount, setAmount] = useState(String(draft.total))
  const [category, setCategory] = useState(draft.category)
  const [note, setNote] = useState(draft.note)
  const [date, setDate] = useState(draft.date || todayIsoDate())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedAmount = Number(amount.replace(/[^\d]/g, ''))

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Jumlah harus lebih dari 0.')
      return
    }

    setSaving(true)
    setError('')

    const input: ExpenseInput = {
      amount: parsedAmount,
      category,
      note: note.trim(),
      type: category === INCOME_CATEGORY ? 'income' : 'expense',
      spent_at: date,
    }

    const { error: saveError } = await supabase.from('expenses').insert(input)
    setSaving(false)

    if (saveError) {
      setError('Gagal menyimpan. Coba lagi.')
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-surface p-5"
      >
        <div>
          <p className="font-semibold text-ink">Hasil bacaan struk</p>
          <p className="text-xs text-muted">Periksa dan koreksi bila perlu, lalu simpan.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="receipt-amount" className="block text-sm font-medium text-ink">
            Total (Rp)
          </label>
          <input
            id="receipt-amount"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="receipt-category" className="block text-sm font-medium text-ink">
            Kategori
          </label>
          <select
            id="receipt-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="receipt-note" className="block text-sm font-medium text-ink">
            Catatan
          </label>
          <input
            id="receipt-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={draft.merchant || 'Keterangan'}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="receipt-date" className="block text-sm font-medium text-ink">
            Tanggal
          </label>
          <input
            id="receipt-date"
            type="date"
            value={date}
            max={todayIsoDate()}
            onChange={(event) => setDate(event.target.value)}
            required
            className={inputClass}
          />
        </div>

        {draft.items.length > 0 && (
          <details className="rounded-xl border border-line px-4 py-2">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Rincian terbaca ({draft.items.length} item)
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {draft.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-3">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 tabular-nums">{formatRupiah(item.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {error && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-ink"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** Tombol kamera: pilih/ambil foto struk, kirim ke Gemini, tampilkan draf untuk disetujui. */
export default function ReceiptScanner({ categories, onSaved }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [draft, setDraft] = useState<ReceiptDraft | null>(null)
  const [message, setMessage] = useState('')

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // supaya memilih file yang sama dua kali tetap memicu
    if (!file) return

    setScanning(true)
    setMessage('')

    const result = await scanReceipt(file, categories)
    setScanning(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setDraft(result.draft)
  }

  return (
    <>
      {/* Tanpa atribut capture: Android menawarkan Kamera atau Galeri/File, bukan langsung kamera. */}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={scanning}
        aria-label="Scan struk dari kamera atau galeri"
        title="Scan struk dari kamera atau galeri"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-primary transition hover:border-primary/40 active:scale-95 disabled:opacity-50"
      >
        {scanning ? (
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        ) : (
          <CameraIcon />
        )}
      </button>

      {message && (
        <p className="basis-full rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{message}</p>
      )}

      {draft && (
        <DraftForm
          draft={draft}
          categories={categories}
          onCancel={() => setDraft(null)}
          onSaved={() => {
            setDraft(null)
            onSaved()
          }}
        />
      )}
    </>
  )
}
