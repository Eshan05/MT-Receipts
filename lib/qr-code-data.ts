export type QrRasterFormat = 'png' | 'jpeg'

function isProbablyBase64(value: string): boolean {
  // Reject data URLs and obvious non-base64 strings.
  if (value.startsWith('data:')) return false
  if (value.length < 32) return false
  return /^[A-Za-z0-9+/=\s]+$/.test(value)
}

function guessRasterFormatFromBase64(value: string): QrRasterFormat | null {
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A => iVBORw0KGgo
  if (value.startsWith('iVBORw0KGgo')) return 'png'
  // JPEG magic bytes: FF D8 FF => /9j/
  if (value.startsWith('/9j/')) return 'jpeg'
  return null
}

export function isSupportedRasterQrDataUrl(value: string): boolean {
  return /^data:image\/(png|jpe?g);base64,/i.test(value)
}

export function normalizeQrCodeDataUrl(
  value: string | undefined
): string | undefined {
  if (!value) return undefined

  // Already supported.
  if (isSupportedRasterQrDataUrl(value)) return value

  // Explicitly reject SVG for PDF embedding.
  if (/^data:image\/svg\+xml/i.test(value)) return undefined

  // If it's raw base64, attempt to normalize to a supported raster data URL.
  if (isProbablyBase64(value)) {
    const trimmed = value.replace(/\s+/g, '')
    const format = guessRasterFormatFromBase64(trimmed) || 'png'
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    return `data:${mime};base64,${trimmed}`
  }

  return undefined
}
