import { daysInMonth, isSameMonth, currentMonth } from './month'
import type { MonthKey } from './month'
import type { Expense } from '../types'

export type DailyTotal = {
  day: number
  date: string
  total: number
  count: number
  /** Transaksi pada hari itu, terbaru di atas. Dipakai untuk rincian yang bisa dibuka-tutup. */
  items: Expense[]
}

export type CategoryTotal = {
  category: string
  total: number
  count: number
  percent: number
}

export type MonthStats = {
  total: number
  count: number
  averagePerDay: number
  highest: Expense | null
  daily: DailyTotal[] // semua hari dalam bulan (untuk chart), termasuk yang 0
  dailyWithData: DailyTotal[] // hanya hari yang ada transaksi, terbaru di atas (untuk daftar)
  byCategory: CategoryTotal[]
}

/** Menghitung seluruh angka Dashboard dari transaksi satu bulan. Hanya pengeluaran yang dihitung. */
export function computeMonthStats(rows: Expense[], month: MonthKey): MonthStats {
  const expenses = rows.filter((row) => row.type === 'expense')
  const dayCount = daysInMonth(month)
  const monthPrefix = `${month.year}-${String(month.month).padStart(2, '0')}-`

  const daily: DailyTotal[] = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1
    return { day, date: monthPrefix + String(day).padStart(2, '0'), total: 0, count: 0, items: [] }
  })

  const categoryMap = new Map<string, { total: number; count: number }>()
  let total = 0
  let highest: Expense | null = null

  for (const row of expenses) {
    const day = Number(row.spent_at.slice(8, 10))
    const bucket = daily[day - 1]
    if (bucket) {
      bucket.total += row.amount
      bucket.count += 1
      bucket.items.push(row)
    }

    const entry = categoryMap.get(row.category) ?? { total: 0, count: 0 }
    entry.total += row.amount
    entry.count += 1
    categoryMap.set(row.category, entry)

    total += row.amount
    if (!highest || row.amount > highest.amount) {
      highest = row
    }
  }

  // Rata-rata dibagi hari yang sudah berjalan bila bulan ini, atau seluruh hari bila bulan lalu.
  const elapsedDays = isSameMonth(month, currentMonth()) ? new Date().getDate() : dayCount
  const averagePerDay = elapsedDays > 0 ? total / elapsedDays : 0

  const byCategory: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([category, entry]) => ({
      category,
      total: entry.total,
      count: entry.count,
      percent: total > 0 ? (entry.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return {
    total,
    count: expenses.length,
    averagePerDay,
    highest,
    daily,
    dailyWithData: daily
      .filter((item) => item.count > 0)
      .map((item) => ({ ...item, items: [...item.items].reverse() }))
      .reverse(),
    byCategory,
  }
}
