const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
})

export function formatRupiah(value: number): string {
    return rupiahFormatter.format(value)
}
/** Tanggal hari ini dalam bentuk YYYY-MM-DD mengikuti zona waktu perangkat. */
export function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Sapaan sesuai jam perangkat. */
export function greetingByHour(hour = new Date().getHours()): string {
  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

const shortDateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

/** "2026-09-13" -> "13 Sep". Bila hari ini, tampilkan "Hari ini". */
export function formatShortDate(isoDate: string): string {
  if (isoDate === todayIsoDate()) return 'Hari ini'
  const [year, month, day] = isoDate.split('-').map(Number)
  return shortDateFormatter.format(new Date(year, month - 1, day))
}
