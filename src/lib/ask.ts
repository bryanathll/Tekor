import { supabase } from './supabase'
import { todayIsoDate } from './format'
import { readFunctionError } from './receipt'
import type { Category, Expense, QueryFilter } from '../types'

const EXPENSE_COLUMNS = 'id, amount, category, note, type, spent_at, created_at'

export type AskResult =
  | { ok: true; filter: QueryFilter; rows: Expense[] }
  | { ok: false; message: string }

/** Menerjemahkan pertanyaan lewat Edge Function `ask-query`; Gemini hanya menerima pertanyaannya. */
async function translateQuestion(
  question: string,
  categories: Category[],
): Promise<{ filter?: QueryFilter; message?: string }> {
  const { data, error } = await supabase.functions.invoke<{ filter?: QueryFilter; error?: string }>(
    'ask-query',
    {
      body: {
        question,
        categories: categories.map((category) => category.name),
        today: todayIsoDate(),
      },
    },
  )

  if (error || !data?.filter) {
    const detail = await readFunctionError(error)
    return { message: detail ?? 'Pertanyaan tidak dapat diproses. Coba ubah kalimatnya.' }
  }

  return { filter: data.filter }
}

/** Menjalankan filter ke database. Perhitungan dilakukan di aplikasi, bukan oleh Gemini. */
async function runFilter(filter: QueryFilter): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .gte('spent_at', filter.date_from)
    .lte('spent_at', filter.date_to)
    .order('spent_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)

  if (filter.type !== 'all') {
    query = query.eq('type', filter.type)
  }

  if (filter.categories.length > 0) {
    query = query.in('category', filter.categories)
  }

  if (filter.keywords.length > 0) {
    // Cocokkan kata di catatan ATAU nama kategori. Tanda % berarti "apa saja" di kiri-kanan kata.
    const clauses = filter.keywords.flatMap((word) => {
      const safe = word.replace(/[%,()]/g, '')
      return [`note.ilike.%${safe}%`, `category.ilike.%${safe}%`]
    })
    query = query.or(clauses.join(','))
  }

  const { data, error } = await query
  if (error || !data) {
    console.error('runFilter:', error?.message ?? 'tanpa data')
    return []
  }

  return data.map((row) => ({ ...row, amount: Number(row.amount) }))
}

export async function askQuestion(question: string, categories: Category[]): Promise<AskResult> {
  const translated = await translateQuestion(question, categories)
  if (!translated.filter) {
    return { ok: false, message: translated.message ?? 'Pertanyaan tidak dapat diproses.' }
  }

  const rows = await runFilter(translated.filter)
  return { ok: true, filter: translated.filter, rows }
}

export type Answer = {
  headline: string
  detail: string
}

/** Menyusun kalimat jawaban dari hasil query sesuai metrik yang diminta. */
export function summarizeAnswer(
  filter: QueryFilter,
  rows: Expense[],
  formatRupiah: (value: number) => string,
  formatDate: (iso: string) => string,
): Answer {
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  const count = rows.length
  const scope = describeScope(filter, formatDate)

  if (count === 0) {
    return { headline: 'Tidak ada transaksi', detail: scope }
  }

  switch (filter.metric) {
    case 'count':
      return { headline: `${count} transaksi`, detail: `${scope} · total ${formatRupiah(total)}` }
    case 'average':
      return {
        headline: formatRupiah(Math.round(total / count)),
        detail: `rata-rata per transaksi · ${count} transaksi · ${scope}`,
      }
    case 'max': {
      const biggest = rows.reduce((best, row) => (row.amount > best.amount ? row : best), rows[0])
      return {
        headline: formatRupiah(biggest.amount),
        detail: `${biggest.note || biggest.category} · ${formatDate(biggest.spent_at)} · ${scope}`,
      }
    }
    case 'list':
      return { headline: `${count} transaksi`, detail: `${scope} · total ${formatRupiah(total)}` }
    default:
      return { headline: formatRupiah(total), detail: `${count} transaksi · ${scope}` }
  }
}

function describeScope(filter: QueryFilter, formatDate: (iso: string) => string): string {
  const parts: string[] = []
  if (filter.type === 'income') parts.push('pemasukan')
  if (filter.categories.length > 0) parts.push(filter.categories.join(', '))
  if (filter.keywords.length > 0) parts.push(`"${filter.keywords.join('", "')}"`)
  parts.push(`${formatDate(filter.date_from)} – ${formatDate(filter.date_to)}`)
  return parts.join(' · ')
}
