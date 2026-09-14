import { useEffect, useMemo, useState } from 'react'
import type { SubmitEvent } from 'react'
import PageShell from '../components/PageShell'
import MonthPicker from '../components/MonthPicker'
import { fetchBalanceBefore, fetchMonthExpenses, fetchSettings, saveSettings } from '../lib/expenses'
import { formatRupiah, formatShortDate } from '../lib/format'
import { currentMonth, isSameMonth, monthLabel, monthStart } from '../lib/month'
import type { MonthKey } from '../lib/month'
import type { Expense, Settings } from '../types'

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted/60 ' +
  'outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15'

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{children}</h2>
}

type SummaryRowProps = {
  label: string
  value: number
  tone?: 'default' | 'income' | 'expense' | 'strong'
}

function SummaryRow({ label, value, tone = 'default' }: SummaryRowProps) {
  const valueClass = {
    default: 'text-ink',
    income: 'text-green-700',
    expense: 'text-primary',
    strong: 'text-ink font-bold',
  }[tone]

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>
        {tone === 'income' && '+'}
        {tone === 'expense' && '-'}
        {formatRupiah(value)}
      </span>
    </div>
  )
}

type SettingsEditorProps = {
  initial: Settings
  onCancel: () => void
  onSaved: (settings: Settings) => void
}

/** Form saldo pembuka: saldo pada tanggal tertentu, titik awal seluruh perhitungan. */
function SettingsEditor({ initial, onCancel, onSaved }: SettingsEditorProps) {
  const [balance, setBalance] = useState(String(initial.opening_balance))
  const [date, setDate] = useState(initial.opening_date)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number(balance.replace(/[^\d-]/g, ''))

    if (!Number.isFinite(parsed)) {
      setError('Saldo harus berupa angka.')
      return
    }

    setSaving(true)
    const next: Settings = { opening_balance: parsed, opening_date: date }
    const result = await saveSettings(next)
    setSaving(false)

    if (result) {
      setError(result)
      return
    }

    onSaved(next)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4">
      <div className="space-y-1.5">
        <label htmlFor="opening-balance" className="block text-sm font-medium text-ink">
          Saldo pembuka (Rp)
        </label>
        <input
          id="opening-balance"
          inputMode="numeric"
          value={balance}
          onChange={(event) => setBalance(event.target.value)}
          placeholder="Contoh: 1500000"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="opening-date" className="block text-sm font-medium text-ink">
          Berlaku sejak tanggal
        </label>
        <input
          id="opening-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
          className={inputClass}
        />
        <p className="text-xs text-muted">
          Saldo di atas dianggap sebagai saldo pada awal tanggal ini. Transaksi sebelum tanggal ini
          tidak ikut dihitung.
        </p>
      </div>

      {error && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{error}</p>}

      <div className="flex gap-2">
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
  )
}

type MonthData = {
  month: MonthKey
  rows: Expense[]
  openingBalance: number
}

export default function Statement() {
  const [month, setMonth] = useState(currentMonth)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [data, setData] = useState<MonthData | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let active = true
    fetchSettings().then((result) => {
      if (active) setSettings(result)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!settings) return
    let active = true

    Promise.all([fetchMonthExpenses(month), fetchBalanceBefore(monthStart(month), settings)]).then(
      ([rows, openingBalance]) => {
        if (active) setData({ month, rows, openingBalance })
      },
    )

    return () => {
      active = false
    }
  }, [month, settings])

  const loading = !data || !isSameMonth(data.month, month)

  const summary = useMemo(() => {
    if (!data) return null

    let income = 0
    let expense = 0
    let running = data.openingBalance

    const lines = data.rows.map((row) => {
      if (row.type === 'income') {
        income += row.amount
        running += row.amount
      } else {
        expense += row.amount
        running -= row.amount
      }
      return { row, balance: running }
    })

    return {
      opening: data.openingBalance,
      income,
      expense,
      closing: running,
      lines: lines.reverse(), // terbaru di atas
    }
  }, [data])

  const settingsButton = (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={!settings || editing}
      className="text-sm font-medium text-primary disabled:opacity-50"
    >
      Saldo pembuka
    </button>
  )

  return (
    <PageShell title="e-Statement" action={settingsButton}>
      {editing && settings && (
        <div className="mb-4">
          <SettingsEditor
            initial={settings}
            onCancel={() => setEditing(false)}
            onSaved={(next) => {
              setSettings(next)
              setEditing(false)
            }}
          />
        </div>
      )}

      <MonthPicker value={month} onChange={setMonth} />

      {/* Ringkasan rekening */}
      <section className="mt-5">
        <SectionTitle>Ringkasan rekening</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="border-b border-line bg-primary/5 px-4 py-3">
            <p className="text-sm font-semibold text-ink">{monthLabel(month)}</p>
            {settings && (
              <p className="text-xs text-muted">
                Saldo pembuka {formatRupiah(settings.opening_balance)} sejak{' '}
                {formatShortDate(settings.opening_date)}
              </p>
            )}
          </div>
          {loading || !summary ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Memuat...</p>
          ) : (
            <div className="divide-y divide-line">
              <SummaryRow label="Saldo awal" value={summary.opening} />
              <SummaryRow label="Transaksi masuk" value={summary.income} tone="income" />
              <SummaryRow label="Transaksi keluar" value={summary.expense} tone="expense" />
              <SummaryRow label="Saldo akhir" value={summary.closing} tone="strong" />
            </div>
          )}
        </div>
      </section>

      {/* Rincian transaksi */}
      <section className="mt-8">
        <SectionTitle>Rincian transaksi</SectionTitle>
        {loading || !summary ? (
          <p className="text-sm text-muted">Memuat...</p>
        ) : summary.lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            Tidak ada transaksi pada bulan ini.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {summary.lines.map(({ row, balance }) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-ink">{row.note || row.category}</p>
                  <p
                    className={
                      row.type === 'income'
                        ? 'shrink-0 font-semibold text-green-700 tabular-nums'
                        : 'shrink-0 font-semibold text-ink tabular-nums'
                    }
                  >
                    {row.type === 'income' ? '+' : '-'}
                    {formatRupiah(row.amount)}
                  </p>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>
                    {formatShortDate(row.spent_at)} · {row.category}
                  </span>
                  <span className="tabular-nums">Saldo {formatRupiah(balance)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
