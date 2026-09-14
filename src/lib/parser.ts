import { DEFAULT_CATEGORY, INCOME_CATEGORY } from './categories'
import type { Category, TransactionType } from '../types'

export type ParsedExpense = {
  amount: number
  category: string
  note: string
  type: TransactionType
  confident: boolean
}

const MULTIPLIER: Record<string, number> = {
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  jt: 1_000_000,
  juta: 1_000_000,
}

const AMOUNT_PATTERN = /(\d+(?:[.,]\d+)*)\s*(juta|ribu|jt|rb|k)?/i

/**
 * Membaca jumlah, kategori, dan catatan dari kalimat.
 * Kategori dicocokkan dari kata kunci milik pengguna (tabel categories).
 * Bila cocok dengan kategori Pemasukan, jenisnya 'income'.
 */
export function parseExpense(text: string, categories: Category[]): ParsedExpense | null {
  const match = text.match(AMOUNT_PATTERN)

  if (!match) {
    return null
  }

  const rawNumber = match[1]
  const suffix = match[2]?.toLowerCase()

  const amount = suffix
    ? Number(rawNumber.replace(',', '.')) * MULTIPLIER[suffix]
    : Number(rawNumber.replace(/[.,]/g, ''))

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  const note = text.replace(match[0], ' ').replace(/\s+/g, ' ').trim()
  const category = detectCategory(text, categories)

  return {
    amount: Math.round(amount),
    category,
    note,
    type: category === INCOME_CATEGORY ? 'income' : 'expense',
    confident: category !== DEFAULT_CATEGORY,
  }
}

function detectCategory(text: string, categories: Category[]): string {
  const lowerText = text.toLowerCase()

  for (const category of categories) {
    if (category.keywords.some((keyword) => keyword !== '' && lowerText.includes(keyword))) {
      return category.name
    }
  }

  return DEFAULT_CATEGORY
}
