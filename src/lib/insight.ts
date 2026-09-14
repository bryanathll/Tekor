import { supabase } from './supabase'
import { readFunctionError } from './receipt'
import { fetchMonthExpenses } from './expenses'
import { computeMonthStats } from './stats'
import type { MonthStats } from './stats'
import { currentMonth, daysInMonth, isSameMonth, monthLabel, shiftMonth } from './month'
import type { MonthKey } from './month'
import type { Expense } from '../types'

export type Insight = {
  headline: string
  highlights: string[]
}

type CachedInsight = Insight & { signature: string }

/**
 * Menyusun ANGKA AGREGAT yang dikirim ke Gemini. Tidak ada transaksi satu per satu,
 * kecuali satu transaksi terbesar (jumlah, kategori, catatan) sebagai sorotan.
 */
function buildPayload(month: MonthKey, rows: Expense[], stats: MonthStats, previousRows: Expense[]) {
  const previousMonth = shiftMonth(month, -1)
  const previousStats = computeMonthStats(previousRows, previousMonth)
  const income = rows
    .filter((row) => row.type === 'income')
    .reduce((sum, row) => sum + row.amount, 0)

  return {
    monthLabel: monthLabel(month),
    daysElapsed: isSameMonth(month, currentMonth()) ? new Date().getDate() : daysInMonth(month),
    daysInMonth: daysInMonth(month),
    total: stats.total,
    count: stats.count,
    averagePerDay: Math.round(stats.averagePerDay),
    income,
    byCategory: stats.byCategory.map(({ category, total, count }) => ({ category, total, count })),
    topDays: [...stats.dailyWithData]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(({ date, total }) => ({ date, total })),
    highest: stats.highest
      ? {
          amount: stats.highest.amount,
          category: stats.highest.category,
          note: stats.highest.note ?? '',
          date: stats.highest.spent_at,
        }
      : null,
    previous:
      previousStats.count > 0
        ? {
            monthLabel: monthLabel(previousMonth),
            total: previousStats.total,
            count: previousStats.count,
            byCategory: previousStats.byCategory.map(({ category, total, count }) => ({
              category,
              total,
              count,
            })),
          }
        : null,
  }
}

function cacheKey(month: MonthKey): string {
  return `tekor:insight:${month.year}-${String(month.month).padStart(2, '0')}`
}

/** Ringkasan tersimpan dipakai ulang selama data bulan itu belum berubah (tanda: total dan jumlah). */
export function readCachedInsight(month: MonthKey, stats: MonthStats): Insight | null {
  try {
    const raw = localStorage.getItem(cacheKey(month))
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedInsight
    return cached.signature === `${stats.total}:${stats.count}` ? cached : null
  } catch {
    return null
  }
}

export type InsightResult = { ok: true; insight: Insight } | { ok: false; message: string }

/** Meminta ringkasan ke Edge Function `monthly-insight`, lalu menyimpannya di perangkat. */
export async function generateInsight(
  month: MonthKey,
  rows: Expense[],
  stats: MonthStats,
): Promise<InsightResult> {
  const previousRows = await fetchMonthExpenses(shiftMonth(month, -1))
  const payload = buildPayload(month, rows, stats, previousRows)

  const { data, error } = await supabase.functions.invoke<Insight & { error?: string }>(
    'monthly-insight',
    { body: { payload } },
  )

  if (error || !data?.headline) {
    const detail = await readFunctionError(error)
    return { ok: false, message: detail ?? 'Ringkasan tidak dapat dibuat sekarang. Coba lagi nanti.' }
  }

  const insight: Insight = { headline: data.headline, highlights: data.highlights ?? [] }

  try {
    const cached: CachedInsight = { ...insight, signature: `${stats.total}:${stats.count}` }
    localStorage.setItem(cacheKey(month), JSON.stringify(cached))
  } catch {
    // Penyimpanan lokal tidak tersedia; ringkasan tetap ditampilkan.
  }

  return { ok: true, insight }
}
