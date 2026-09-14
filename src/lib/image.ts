export type EncodedImage = {
  base64: string
  mimeType: 'image/jpeg'
}

const MAX_SIDE = 1280
const QUALITY = 0.8

/**
 * Mengecilkan foto sebelum dikirim ke server: sisi terpanjang maksimal 1280 px, JPEG.
 * Foto kamera HP bisa 4-8 MB; setelah ini biasanya 150-400 KB. Struk tetap terbaca jelas.
 */
export async function compressImage(file: File): Promise<EncodedImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas tidak tersedia')
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' }
}
