import { supabase } from './supabase'
import { INCOME_CATEGORY } from './categories'
import type { Category, ExpenseInput } from '../types'

type GeminiItem = {
  amount: number
  category: string
  note: string
}

type ParseResponse = {
  items?: GeminiItem[]
  error?: string
}

/**
 * Mengirim kalimat ke Edge Function `parse-expense` beserta daftar kategori pengguna.
 * Edge Function memanggil Gemini di server, sehingga API key tidak pernah sampai ke browser.
 * Mengembalikan daftar kosong bila Gemini tidak menemukan transaksi atau terjadi kegagalan.
 */
export async function parseWithGemini(text: string, categories: Category[]): Promise<ExpenseInput[]> {
  const { data, error } = await supabase.functions.invoke<ParseResponse>('parse-expense', {
    body: { text, categories: categories.map((category) => category.name) },
  })

  if (error || !data?.items) {
    return []
  }

  return data.items.map((item) => ({
    ...item,
    type: item.category === INCOME_CATEGORY ? 'income' : 'expense',
  }))
}
