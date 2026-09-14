/** Alat bantu bulan untuk Dashboard dan e-Statement. Bulan memakai angka 1-12. */

export type MonthKey = {
  year: number
  month: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function currentMonth(now = new Date()): MonthKey {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function shiftMonth({ year, month }: MonthKey, delta: number): MonthKey {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function isSameMonth(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month
}

/** Tanggal pertama bulan, bentuk YYYY-MM-DD. */
export function monthStart({ year, month }: MonthKey): string {
  return `${year}-${pad(month)}-01`
}

/** Tanggal terakhir bulan, bentuk YYYY-MM-DD. */
export function monthEnd({ year, month }: MonthKey): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${pad(month)}-${pad(lastDay)}`
}

export function daysInMonth({ year, month }: MonthKey): number {
  return new Date(year, month, 0).getDate()
}

const monthLabelFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })

/** "September 2026" */
export function monthLabel({ year, month }: MonthKey): string {
  return monthLabelFormatter.format(new Date(year, month - 1, 1))
}
