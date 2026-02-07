import { renderToStream } from '@react-pdf/renderer'
import ProfessionalTemplate from '../lib/templates/professional'
import type { TemplateProps } from '../lib/templates/types'
import { generateReceiptQRCode } from '../lib/qr-code'
import { ensureQrPngIsRgbDataUrl } from '../lib/qr-code-data'
import zlib from 'node:zlib'

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function countNeedle(buf: Buffer, needle: string): number {
  const n = Buffer.from(needle)
  let count = 0
  let idx = 0
  while (true) {
    const next = buf.indexOf(n, idx)
    if (next === -1) break
    count++
    idx = next + n.length
  }
  return count
}

function extractFirstDeviceRgbImage(buf: Buffer): {
  dictText: string
  stream: Buffer
} | null {
  const needle = Buffer.from('/Subtype /Image')
  let idx = 0
  while (true) {
    const found = buf.indexOf(needle, idx)
    if (found === -1) return null
    const dictStart = Math.max(0, buf.lastIndexOf(Buffer.from('<<'), found))
    const dictEnd = buf.indexOf(Buffer.from('>>'), found)
    if (dictStart === -1 || dictEnd === -1) return null
    const dictText = buf.slice(dictStart, dictEnd + 2).toString('latin1')

    if (!dictText.includes('/ColorSpace /DeviceRGB')) {
      idx = found + needle.length
      continue
    }

    const streamStart = buf.indexOf(Buffer.from('stream\n'), dictEnd)
    if (streamStart === -1) return null
    const dataStart = streamStart + Buffer.from('stream\n').length
    const endStream = buf.indexOf(Buffer.from('\nendstream'), dataStart)
    if (endStream === -1) return null
    const stream = buf.slice(dataStart, endStream)

    return { dictText, stream }
  }
}

function analyzePredictor15Rgb(
  inflated: Buffer,
  width: number,
  height: number
) {
  const rowSize = 1 + width * 3
  const expected = rowSize * height
  const sampleStep = Math.max(1, Math.floor((width * height) / 5000))

  let dark = 0
  let light = 0
  let sampled = 0

  for (let y = 0; y < height; y++) {
    const rowOff = y * rowSize
    // inflated[rowOff] is the PNG filter byte; pixels start at rowOff+1
    for (let x = 0; x < width; x += sampleStep) {
      const i = rowOff + 1 + x * 3
      const r = inflated[i] ?? 0
      const g = inflated[i + 1] ?? 0
      const b = inflated[i + 2] ?? 0
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (lum < 80) dark++
      if (lum > 200) light++
      sampled++
    }
  }

  return {
    expected,
    actual: inflated.length,
    sampled,
    darkPct: Math.round((dark / sampled) * 1000) / 10,
    lightPct: Math.round((light / sampled) * 1000) / 10,
  }
}

function unfilterPngPredictor(
  inflated: Buffer,
  width: number,
  height: number,
  bpp: number
): Buffer {
  const rowSize = 1 + width * bpp
  const out = Buffer.alloc(width * height * bpp)

  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    if (pa <= pb && pa <= pc) return a
    if (pb <= pc) return b
    return c
  }

  for (let y = 0; y < height; y++) {
    const rowOff = y * rowSize
    const filter = inflated[rowOff] ?? 0
    const inRow = inflated.subarray(rowOff + 1, rowOff + rowSize)
    const outRowOff = y * width * bpp

    for (let x = 0; x < width * bpp; x++) {
      const raw = inRow[x] ?? 0
      const left = x >= bpp ? (out[outRowOff + x - bpp] ?? 0) : 0
      const up = y > 0 ? (out[outRowOff + x - width * bpp] ?? 0) : 0
      const upLeft =
        y > 0 && x >= bpp ? (out[outRowOff + x - width * bpp - bpp] ?? 0) : 0

      let val = raw
      switch (filter) {
        case 0: // None
          val = raw
          break
        case 1: // Sub
          val = (raw + left) & 0xff
          break
        case 2: // Up
          val = (raw + up) & 0xff
          break
        case 3: // Average
          val = (raw + Math.floor((left + up) / 2)) & 0xff
          break
        case 4: // Paeth
          val = (raw + paeth(left, up, upLeft)) & 0xff
          break
        default:
          // Unknown filter; leave raw.
          val = raw
      }

      out[outRowOff + x] = val
    }
  }

  return out
}

function analyzeRgbPixels(pixels: Buffer) {
  const total = Math.floor(pixels.length / 3)
  const sampleStep = Math.max(1, Math.floor(total / 5000))

  let dark = 0
  let light = 0
  let sampled = 0

  for (let i = 0; i < pixels.length; i += 3 * sampleStep) {
    const r = pixels[i] ?? 0
    const g = pixels[i + 1] ?? 0
    const b = pixels[i + 2] ?? 0
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (lum < 80) dark++
    if (lum > 200) light++
    sampled++
  }

  return {
    sampled,
    darkPct: Math.round((dark / sampled) * 1000) / 10,
    lightPct: Math.round((light / sampled) * 1000) / 10,
  }
}

async function renderPdf(qrCodeData: string | undefined): Promise<Buffer> {
  const props: TemplateProps = {
    receiptNumber: 'TEST123',
    customer: { name: 'Test Customer', email: 'test@example.com' },
    event: {
      name: 'Test Event',
      code: 'EVT',
      type: 'other',
      location: 'Test Location',
      startDate: 'January 1, 2025',
      endDate: undefined,
    },
    items: [
      { name: 'Item', description: '', quantity: 1, price: 10, total: 10 },
    ],
    totalAmount: 10,
    paymentMethod: 'cash',
    date: 'January 1, 2025',
    config: {
      primaryColor: '#1E40AF',
      secondaryColor: '#000000',
      showQrCode: true,
      organizationName: 'ACES',
      logoUrl: undefined,
      footerText: undefined,
    },
    notes: '',
    qrCodeData,
  }

  const stream = await renderToStream(ProfessionalTemplate(props) as any)
  return streamToBuffer(stream as any)
}

async function main() {
  const rgbaQr = await generateReceiptQRCode('TEST123', 'aces')
  const rgbQr = await ensureQrPngIsRgbDataUrl(rgbaQr, '#ffffff')

  const rgbaPdf = await renderPdf(rgbaQr)
  const rgbPdf = await renderPdf(rgbQr)

  const rgbImg = extractFirstDeviceRgbImage(rgbPdf)
  const rgbaImg = extractFirstDeviceRgbImage(rgbaPdf)

  const width = 400
  const height = 400

  const rgbInflated = rgbImg ? zlib.inflateSync(rgbImg.stream) : null
  const rgbaInflated = rgbaImg ? zlib.inflateSync(rgbaImg.stream) : null

  const result = {
    rgba: {
      bytes: rgbaPdf.length,
      imageCount: countNeedle(rgbaPdf, '/Subtype /Image'),
      sMaskCount: countNeedle(rgbaPdf, '/SMask'),
      imageMaskCount: countNeedle(rgbaPdf, '/ImageMask'),
      filterFlate: countNeedle(rgbaPdf, '/Filter /FlateDecode'),
      filterDct: countNeedle(rgbaPdf, '/Filter /DCTDecode'),
      extractedDeviceRgb: !!rgbaImg,
      deviceRgbDictHasDecodeParms:
        rgbaImg?.dictText.includes('/DecodeParms') || false,
      inflated: rgbaInflated
        ? analyzePredictor15Rgb(rgbaInflated, width, height)
        : null,
    },
    rgb: {
      bytes: rgbPdf.length,
      imageCount: countNeedle(rgbPdf, '/Subtype /Image'),
      sMaskCount: countNeedle(rgbPdf, '/SMask'),
      imageMaskCount: countNeedle(rgbPdf, '/ImageMask'),
      filterFlate: countNeedle(rgbPdf, '/Filter /FlateDecode'),
      filterDct: countNeedle(rgbPdf, '/Filter /DCTDecode'),
      extractedDeviceRgb: !!rgbImg,
      deviceRgbDictHasDecodeParms:
        rgbImg?.dictText.includes('/DecodeParms') || false,
      inflated: rgbInflated
        ? analyzePredictor15Rgb(rgbInflated, width, height)
        : null,
      reconstructed: rgbInflated
        ? analyzeRgbPixels(unfilterPngPredictor(rgbInflated, width, height, 3))
        : null,
    },
  }

  console.log(JSON.stringify(result))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
