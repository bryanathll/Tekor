import type { Expense } from '../types'
import { formatRupiah, formatShortDate } from '../lib/format'

type Props = {
  expenses: Expense[]
}

export default function ExpenseList({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
        Belum ada catatan. Tulis pengeluaran pertama di kolom atas.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {expenses.map((expense) => (
        <li key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{expense.note || expense.category}</p>
            <p className="mt-0.5 text-xs text-muted">
              {expense.category} · {formatShortDate(expense.spent_at)}
            </p>
          </div>
          <p
            className={
              expense.type === 'income'
                ? 'shrink-0 font-semibold text-green-700 tabular-nums'
                : 'shrink-0 font-semibold text-ink tabular-nums'
            }
          >
            {expense.type === 'income' ? '+' : ''}
            {formatRupiah(Number(expense.amount))}
          </p>
        </li>
      ))}
    </ul>
  )
}
