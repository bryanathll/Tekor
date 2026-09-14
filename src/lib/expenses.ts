import { supabase } from './supabase'
import { todayIsoDate } from './format'
import { fetchCategories } from './categories'
import { monthEnd, monthStart } from './month'
import type { MonthKey } from './month'
import type { Category, Expense, Settings } from '../types'

const EXPENSE_COLUMNS = 'id, amount, category, note, type, spent_at, created_at'

/** Dua puluh catatan terbaru (masuk dan keluar). Dibatasi agar tetap ringan saat data sudah banyak. */
export async function fetchRecentExpenses(limit = 20): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .order('spent_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {

    console.error('fetchRecentExpenses:', error?.message ?? 'tanpa data')
    return []
  }

  return data
}

/** Jumlah seluruh pengeluaran (bukan pemasukan) hari ini. */
export async function fetchTodayTotal(): Promise<number> {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('type', 'expense')
    .eq('spent_at', todayIsoDate())

  if (error || !data) {

    console.error('fetchTodayTotal:', error?.message ?? 'tanpa data')
    return 0
  }

  return data.reduce((sum, row) => sum + Number(row.amount), 0)
}

export type HomeData = {
  expenses: Expense[]
  todayTotal: number
  categories: Category[]
}

/** Mengambil semua data halaman utama sekaligus (tiga permintaan berjalan bersamaan). */
export async function fetchHomeData(): Promise<HomeData> {
  const [expenses, todayTotal, categories] = await Promise.all([
    fetchRecentExpenses(),
    fetchTodayTotal(),
    fetchCategories(),
  ])
  return { expenses, todayTotal, categories }
}

/** Seluruh transaksi satu bulan, urut dari tanggal terlama (untuk chart, rekap, dan saldo berjalan). */
export async function fetchMonthExpenses(month: MonthKey): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .gte('spent_at', monthStart(month))
    .lte('spent_at', monthEnd(month))
    .order('spent_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error || !data) {

    console.error('fetchMonthExpenses:', error?.message ?? 'tanpa data')
    return []
  }

  return data.map((row) => ({ ...row, amount: Number(row.amount) }))
}

export async function fetchSettings(): Promise<Settings> {
  const { data } = await supabase
    .from('settings')
    .select('opening_balance, opening_date')
    .maybeSingle()

  if (!data) {
    return { opening_balance: 0, opening_date: todayIsoDate() }
  }

  return { opening_balance: Number(data.opening_balance), opening_date: data.opening_date }
}

export async function saveSettings(settings: Settings): Promise<string | null> {
  const { error } = await supabase
    .from('settings')
    .upsert({ ...settings, updated_at: new Date().toISOString() })

  return error ? 'Gagal menyimpan pengaturan.' : null
}

/**
 * Saldo pada awal tanggal `beforeDate`:
 * saldo pembuka + (masuk - keluar) untuk transaksi sejak opening_date sampai sehari sebelum beforeDate.
 */
export async function fetchBalanceBefore(beforeDate: string, settings: Settings): Promise<number> {
  if (beforeDate <= settings.opening_date) {
    return settings.opening_balance
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, type')
    .gte('spent_at', settings.opening_date)
    .lt('spent_at', beforeDate)

  if (error || !data) {

    console.error('fetchBalanceBefore:', error?.message ?? 'tanpa data')
    return settings.opening_balance
  }

  return data.reduce(
    (balance, row) => balance + (row.type === 'income' ? Number(row.amount) : -Number(row.amount)),
    settings.opening_balance,
  )
}
