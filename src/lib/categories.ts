import { supabase } from './supabase'
import type { Category } from '../types'

/** Kategori bawaan yang selalu ada dan tidak bisa dihapus. */
export const DEFAULT_CATEGORY = 'Lainnya'
export const INCOME_CATEGORY = 'Pemasukan'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, keywords, is_default, sort_order')
    .order('sort_order')
    .order('name')

  if (error || !data) {

    console.error('fetchCategories:', error?.message ?? 'tanpa data')
    return []
  }

  return data
}

export async function addCategory(name: string, keywords: string[]): Promise<string | null> {
  const { error } = await supabase.from('categories').insert({
    name: name.trim(),
    keywords,
    sort_order: 50,
  })

  if (!error) return null
  if (error.code === '23505') return 'Nama kategori sudah ada.'
  return 'Gagal menambah kategori.'
}

export async function updateCategory(
  id: string,
  changes: { name?: string; keywords?: string[] },
): Promise<string | null> {
  const { error } = await supabase.from('categories').update(changes).eq('id', id)

  if (!error) return null
  if (error.code === '23505') return 'Nama kategori sudah ada.'
  return 'Gagal mengubah kategori.'
}

/** Transaksi lama otomatis pindah ke 'Lainnya' lewat trigger di database. */
export async function deleteCategory(id: string): Promise<string | null> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  return error ? 'Gagal menghapus kategori.' : null
}

/** Mengubah teks "kopi, ngopi, starbucks" menjadi ['kopi','ngopi','starbucks']. */
export function parseKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[,\n]/)
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word !== ''),
    ),
  )
}
