export type TransactionType = 'expense' | 'income'

export type Expense = {
  id: string
  amount: number
  category: string
  note: string | null
  type: TransactionType
  spent_at: string
  created_at: string
}

// Bentuk data yang dikirim ke tabel saat menyimpan catatan baru.
export type ExpenseInput = {
  amount: number
  category: string
  note: string
  type: TransactionType
  /** Tanggal transaksi (YYYY-MM-DD). Bila kosong, database memakai hari ini. */
  spent_at?: string
}

/** Hasil pembacaan struk oleh Gemini, sebelum disetujui pengguna. */
export type ReceiptDraft = {
  merchant: string
  date: string
  total: number
  category: string
  note: string
  items: Array<{ name: string; amount: number }>
}

/** Filter hasil terjemahan pertanyaan. Aplikasi yang menjalankan query-nya. */
export type QueryFilter = {
  type: 'expense' | 'income' | 'all'
  categories: string[]
  keywords: string[]
  date_from: string
  date_to: string
  metric: 'total' | 'count' | 'average' | 'max' | 'list'
}

export type Category = {
  id: string
  name: string
  keywords: string[]
  is_default: boolean
  sort_order: number
}

export type Settings = {
  opening_balance: number
  opening_date: string
}
