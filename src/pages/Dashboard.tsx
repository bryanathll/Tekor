import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import PageShell from '../components/PageShell'
import MonthPicker from '../components/MonthPicker'
import InsightCard from '../components/InsightCard'
import DayGroup from '../components/DayGroup'
import { Link } from 'react-router-dom'
import { fetchMonthExpenses } from '../lib/expenses'
import { computeMonthStats } from '../lib/stats'
import type { DailyTotal } from '../lib/stats'
import { formatRupiah, formatShortDate, todayIsoDate } from '../lib/format'
import { currentMonth, isSameMonth } from '../lib/month'
import type { MonthKey } from '../lib/month'
import type { Expense } from '../types'

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{children}</h2>
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{ payload: DailyTotal }>
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{formatShortDate(item.date)}</p>
      <p className="text-muted">
        {formatRupiah(item.total)} · {item.count} transaksi
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth)
  const [rows, setRows] = useState<Expense[]>([])
  // Bulan yang datanya sudah dimuat. Bila berbeda dengan bulan terpilih, berarti masih memuat.
  const [loadedMonth, setLoadedMonth] = useState<MonthKey | null>(null)
  const loading = !loadedMonth || !isSameMonth(loadedMonth, month)

  useEffect(() => {
    let active = true

    fetchMonthExpenses(month).then((data) => {
      if (active) {
        setRows(data)
        setLoadedMonth(month)
      }
    })

    return () => {
      active = false
    }
  }, [month])

  const stats = useMemo(() => computeMonthStats(rows, month), [rows, month])
  const today = todayIsoDate()

  return (
    <PageShell
      title="Dashboard"
      action={
        <Link to="/tanya" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white">
          Tanya
        </Link>
      }
    >
      <MonthPicker value={month} onChange={setMonth} />

      {/* Informasi terkait */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Total bulan ini" value={formatRupiah(stats.total)} />
        <StatCard label="Jumlah transaksi" value={String(stats.count)} />
        <StatCard label="Rata-rata per hari" value={formatRupiah(Math.round(stats.averagePerDay))} />
        <StatCard
          label="Transaksi tertinggi"
          value={stats.highest ? formatRupiah(stats.highest.amount) : '-'}
          hint={stats.highest ? stats.highest.note || stats.highest.category : undefined}
        />
      </section>

      {/* Ringkasan bulanan oleh Gemini (hanya angka agregat yang dikirim) */}
      {!loading && stats.count > 0 && (
        <section className="mt-8">
          <SectionTitle>Ringkasan</SectionTitle>
          <InsightCard key={`${month.year}-${month.month}`} month={month} rows={rows} stats={stats} />
        </section>
      )}

      {/* Bar chart per hari */}
      <section className="mt-8">
        <SectionTitle>Pengeluaran per hari</SectionTitle>
        <div className="rounded-xl border border-line bg-surface px-2 pt-4 pb-2">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted">Memuat...</p>
          ) : stats.count === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Belum ada pengeluaran bulan ini.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={stats.daily}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                barCategoryGap={2}
              >
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'var(--color-line)', opacity: 0.4 }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {stats.daily.map((item) => (
                    <Cell
                      key={item.day}
                      fill={item.date === today ? 'var(--color-primary-dark)' : 'var(--color-primary)'}
                      fillOpacity={item.total === 0 ? 0.15 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Total per hari */}
      {stats.dailyWithData.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Total per hari</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {stats.dailyWithData.map((item, index) => (
              <DayGroup
                key={item.date}
                day={item}
                label={formatShortDate(item.date)}
                defaultOpen={index === 0}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Ringkasan per kategori */}
      {stats.byCategory.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Per kategori</SectionTitle>
          <ul className="space-y-2">
            {stats.byCategory.map((item) => (
              <li key={item.category} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{item.category}</p>
                  <p className="font-semibold text-ink tabular-nums">{formatRupiah(item.total)}</p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs text-muted tabular-nums">
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  )
}
