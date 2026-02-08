export type QrRasterFormat = 'png' | 'jpeg'

function isPngSignature(bytes: Buffer): boolean {
  return (
    bytes.length >= 26 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
}

function getPngColorType(bytes: Buffer): number | null {
  // PNG IHDR color type is at byte offset 25.
  if (!isPngSignature(bytes)) return null
  return bytes[25] ?? null
}

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

  // Already supported (but still validate content where possible).
  if (isSupportedRasterQrDataUrl(value)) {
    const trimmed = value.replace(/\s+/g, '')
    const [, base64 = ''] = trimmed.split(',')
    const header = trimmed.slice(0, trimmed.indexOf(','))
    const isPng = /^data:image\/png;base64$/i.test(header)
    const isJpeg = /^data:image\/jpe?g;base64$/i.test(header)

    if (isPng && !base64.startsWith('iVBORw0KGgo')) return undefined
    if (isJpeg && !base64.startsWith('/9j/')) return undefined

    return trimmed
  }

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

/**
 * Some PDF viewers (notably Gmail's preview) can render PNGs with alpha masks
 * as a solid square. Our QR generator emits RGBA PNGs; this re-encodes to RGB
 * (no alpha channel) on a solid background.
 */
export async function ensureQrPngIsRgbDataUrl(
  value: string | undefined,
  backgroundColor: string = '#ffffff'
): Promise<string | undefined> {
  const normalized = normalizeQrCodeDataUrl(value)
  if (!normalized) return undefined

  if (!/^data:image\/png;base64,/i.test(normalized)) return normalized

  const [, base64 = ''] = normalized.split(',')
  let bytes: Buffer
  try {
    bytes = Buffer.from(base64, 'base64')
  } catch {
    return undefined
  }

  const colorType = getPngColorType(bytes)
  if (colorType === null) return undefined

  // 6 = RGBA, 4 = grayscale+alpha
  if (colorType !== 6 && colorType !== 4) return normalized

  try {
    const sharpMod = await import('sharp')
    const sharpFn = (sharpMod as any).default ?? (sharpMod as any)
    if (typeof sharpFn !== 'function') return normalized

    const outBytes: Buffer = await sharpFn(bytes)
      .flatten({ background: backgroundColor })
      .png()
      .toBuffer()

    return `data:image/png;base64,${outBytes.toString('base64')}`
  } catch {
    return normalized
  }
}
