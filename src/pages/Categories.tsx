import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import PageShell from '../components/PageShell'
import {
  addCategory,
  deleteCategory,
  fetchCategories,
  parseKeywords,
  updateCategory,
} from '../lib/categories'
import type { Category } from '../types'

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted/60 ' +
  'outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15'

type EditorProps = {
  initial?: Category
  onCancel: () => void
  onSaved: () => void
}

/** Form tambah/ubah kategori. Dipakai untuk keduanya, dibedakan lewat `initial`. */
function CategoryEditor({ initial, onCancel, onSaved }: EditorProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [keywordText, setKeywordText] = useState(initial?.keywords.join(', ') ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const keywords = parseKeywords(keywordText)
    const result = initial
      ? await updateCategory(initial.id, { name: name.trim(), keywords })
      : await addCategory(name, keywords)

    setSaving(false)

    if (result) {
      setError(result)
      return
    }

    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4">
      <div className="space-y-1.5">
        <label htmlFor="category-name" className="block text-sm font-medium text-ink">
          Nama kategori
        </label>
        <input
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Contoh: Kopi"
          required
          maxLength={40}
          disabled={initial?.is_default}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="category-keywords" className="block text-sm font-medium text-ink">
          Kata kunci
        </label>
        <textarea
          id="category-keywords"
          value={keywordText}
          onChange={(event) => setKeywordText(event.target.value)}
          placeholder="Pisahkan dengan koma. Contoh: kopi, ngopi, starbucks"
          rows={3}
          className={inputClass}
        />
        <p className="text-xs text-muted">
          Bila kalimat mengandung salah satu kata ini, transaksi otomatis masuk kategori ini.
        </p>
      </div>

      {error && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-ink"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || name.trim() === ''}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

type Mode = { kind: 'idle' } | { kind: 'add' } | { kind: 'edit'; category: Category }

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    fetchCategories().then((rows) => {
      if (active) setCategories(rows)
    })
    return () => {
      active = false
    }
  }, [])

  function reload() {
    fetchCategories().then(setCategories)
  }

  function handleSaved() {
    setMode({ kind: 'idle' })
    reload()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const error = await deleteCategory(deleteTarget.id)
    setMessage(error ?? `Kategori ${deleteTarget.name} dihapus. Transaksi lamanya pindah ke Lainnya.`)
    setDeleteTarget(null)
    reload()
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setMode({ kind: 'add' })}
      disabled={mode.kind !== 'idle'}
      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
    >
      + Tambah
    </button>
  )

  return (
    <PageShell title="Kategori" action={addButton}>
      {mode.kind === 'add' && (
        <div className="mb-4">
          <CategoryEditor onCancel={() => setMode({ kind: 'idle' })} onSaved={handleSaved} />
        </div>
      )}

      {message && (
        <p className="mb-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {categories.map((category) =>
          mode.kind === 'edit' && mode.category.id === category.id ? (
            <li key={category.id} className="p-2">
              <CategoryEditor
                initial={category}
                onCancel={() => setMode({ kind: 'idle' })}
                onSaved={handleSaved}
              />
            </li>
          ) : (
            <li key={category.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {category.name}
                  {category.is_default && (
                    <span className="ml-2 rounded-full bg-line/60 px-2 py-0.5 text-[10px] font-medium text-muted uppercase">
                      bawaan
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {category.keywords.length > 0 ? category.keywords.join(', ') : 'Tanpa kata kunci'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode({ kind: 'edit', category })}
                className="text-sm font-medium text-primary"
              >
                Ubah
              </button>
              {!category.is_default && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(category)}
                  className="text-sm text-muted"
                >
                  Hapus
                </button>
              )}
            </li>
          ),
        )}
      </ul>

      <p className="mt-3 text-xs text-muted">
        Kategori bawaan (Lainnya, Pemasukan) hanya bisa diubah kata kuncinya. Menghapus kategori
        memindahkan transaksi lamanya ke Lainnya.
      </p>

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5">
            <p className="font-semibold text-ink">Hapus kategori {deleteTarget.name}?</p>
            <p className="mt-1 text-sm text-muted">
              Transaksi yang memakai kategori ini akan dipindahkan ke Lainnya.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-ink"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
