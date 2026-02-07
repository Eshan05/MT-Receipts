export type QrRasterFormat = 'png' | 'jpeg'

function parseHexColorToRgb(color: string | undefined): {
  r: number
  g: number
  b: number
} {
  const fallback = { r: 255, g: 255, b: 255 }
  if (!color) return fallback

  const hex = color.trim().toLowerCase()
  if (!hex.startsWith('#')) return fallback

  const raw = hex.slice(1)
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16)
    const g = parseInt(raw[1] + raw[1], 16)
    const b = parseInt(raw[2] + raw[2], 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return fallback
    return { r, g, b }
  }

  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16)
    const g = parseInt(raw.slice(2, 4), 16)
    const b = parseInt(raw.slice(4, 6), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return fallback
    return { r, g, b }
  }

  return fallback
}

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

  const mod = await import('pngjs')
  const PNG = (mod as any).PNG ?? (mod as any).default?.PNG
  if (!PNG?.sync?.read || !PNG?.sync?.write) {
    return normalized
  }

  const src = PNG.sync.read(bytes)
  const bg = parseHexColorToRgb(backgroundColor)
  const out = new PNG({ width: src.width, height: src.height, colorType: 2 })

  for (let i = 0; i < src.data.length; i += 4) {
    const a = (src.data[i + 3] ?? 255) / 255
    const r = src.data[i] ?? 0
    const g = src.data[i + 1] ?? 0
    const b = src.data[i + 2] ?? 0

    out.data[i] = Math.round(r * a + bg.r * (1 - a))
    out.data[i + 1] = Math.round(g * a + bg.g * (1 - a))
    out.data[i + 2] = Math.round(b * a + bg.b * (1 - a))
    out.data[i + 3] = 255
  }

  const outBytes: Buffer = PNG.sync.write(out, { colorType: 2 })
  return `data:image/png;base64,${outBytes.toString('base64')}`
}
