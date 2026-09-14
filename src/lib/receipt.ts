import { supabase } from './supabase'
import { todayIsoDate } from './format'
import { compressImage } from './image'
import type { Category, ReceiptDraft } from '../types'

type ScanResponse = {
  receipt?: ReceiptDraft
  error?: string
}

export type ScanResult = { ok: true; draft: ReceiptDraft } | { ok: false; message: string }

/** Mengirim foto struk ke Edge Function `scan-receipt` dan mengembalikan draf transaksi. */
export async function scanReceipt(file: File, categories: Category[]): Promise<ScanResult> {
  let image
  try {
    image = await compressImage(file)
  } catch {
    return { ok: false, message: 'Gambar tidak bisa dibaca. Coba foto ulang.' }
  }

  const { data, error } = await supabase.functions.invoke<ScanResponse>('scan-receipt', {
    body: {
      image: image.base64,
      mimeType: image.mimeType,
      categories: categories.map((category) => category.name),
      today: todayIsoDate(),
    },
  })

  if (error || !data?.receipt) {
    const detail = await readFunctionError(error)
    return { ok: false, message: detail ?? 'Struk tidak terbaca. Coba foto lebih dekat dan terang.' }
  }

  return { ok: true, draft: data.receipt }
}

/** Mengambil pesan kesalahan dari balasan Edge Function bila ada. */
export async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response } | null)?.context
  if (!context || typeof context.json !== 'function') return null
  try {
    const body = await context.json()
    return typeof body?.error === 'string' ? body.error : null
  } catch {
    return null
  }
}
