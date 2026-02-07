export interface QRCodeOptions {
  data: string
  width?: number
  height?: number
  margin?: number
  dotsColor?: string
  backgroundColor?: string
  dotsType?: 'square' | 'rounded' | 'dots' | 'classy-rounded' | 'extra-rounded'
  cornersType?: 'square' | 'dot' | 'extra-rounded'
  cornersColor?: string
  logo?: string
  logoSize?: number
  /**
   * Rendering backend selection.
   * - `auto`: try native (@loskir/styled-qr-code-node) then fallback to WASM
   * - `native`: require native renderer (throws if unavailable)
   * - `wasm`: always use qr-code-styling + resvg-wasm
   */
  engine?: 'auto' | 'native' | 'wasm'
}

type ResolvedQrOptions = {
  data: string
  width: number
  height: number
  margin: number
  dotsColor: string
  backgroundColor: string
  dotsType: NonNullable<QRCodeOptions['dotsType']>
  cornersType: NonNullable<QRCodeOptions['cornersType']>
  cornersColor?: string
  logo?: string
  logoSize: number
}

let resvgWasmInit: Promise<void> | null = null

async function getResvgWasm() {
  const mod = await import('@resvg/resvg-wasm')

  if (!resvgWasmInit) {
    resvgWasmInit = (async () => {
      const { readFile } = await import('node:fs/promises')
      const { createRequire } = await import('node:module')

      const require = createRequire(import.meta.url)
      const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm')
      const wasmBytes = await readFile(wasmPath)

      await mod.initWasm(wasmBytes)
    })()
  }

  await resvgWasmInit
  return { Resvg: mod.Resvg }
}

async function tryGenerateWithLoskir(options: ResolvedQrOptions) {
  try {
    const { QRCodeCanvas } = await import('@loskir/styled-qr-code-node')

    const qrCode = new QRCodeCanvas({
      width: options.width,
      height: options.height,
      data: options.data,
      margin: options.margin,
      dotsOptions: {
        color: options.dotsColor,
        type: options.dotsType,
      },
      backgroundOptions: {
        color: options.backgroundColor,
      },
      cornersSquareOptions: {
        type: options.cornersType,
        color: options.cornersColor || options.dotsColor,
      },
      cornersDotOptions: {
        type: 'dot',
        color: options.cornersColor || options.dotsColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 5,
        imageSize: options.logoSize,
        hideBackgroundDots: true,
      },
      qrOptions: {
        errorCorrectionLevel: options.logo ? 'H' : 'M',
      },
      image: options.logo,
    })

    return await qrCode.toDataUrl('png')
  } catch {
    return null
  }
}

export async function generateQRCodeBase64(
  options: QRCodeOptions
): Promise<string> {
  const {
    data,
    width = 150,
    height = 150,
    margin = 0,
    dotsColor = '#000000',
    backgroundColor = '#ffffff',
    dotsType = 'rounded',
    cornersType = 'extra-rounded',
    cornersColor,
    logo,
    logoSize = 0.4,
    engine = 'auto',
  } = options

  const resolved: ResolvedQrOptions = {
    data,
    width,
    height,
    margin,
    dotsColor,
    backgroundColor,
    dotsType,
    cornersType,
    cornersColor,
    logo,
    logoSize,
  }

  if (engine !== 'wasm') {
    const dataUrl = await tryGenerateWithLoskir(resolved)
    if (dataUrl) return dataUrl
    if (engine === 'native') {
      throw new Error(
        'Native QR engine unavailable (@loskir/styled-qr-code-node failed to load)'
      )
    }
  }

  const [{ default: QRCodeStyling }, { JSDOM }] = await Promise.all([
    import('qr-code-styling'),
    import('jsdom'),
  ])

  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="container"></div></body></html>'
  )

  const globalAny = global as any
  const previousGlobals = {
    window: globalAny.window,
    document: globalAny.document,
    HTMLElement: globalAny.HTMLElement,
    Node: globalAny.Node,
  }

  try {
    globalAny.window = dom.window
    globalAny.document = dom.window.document
    globalAny.HTMLElement = dom.window.HTMLElement
    globalAny.Node = dom.window.Node

    const qrCode = new QRCodeStyling({
      type: 'svg',
      width,
      height,
      data,
      margin,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: logo ? 'H' : 'M',
      },
      dotsOptions: {
        color: dotsColor,
        type: dotsType as any,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      cornersSquareOptions: {
        type: cornersType as any,
        color: cornersColor || dotsColor,
      },
      cornersDotOptions: {
        type: 'dot',
        color: cornersColor || dotsColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 5,
        imageSize: logoSize,
        hideBackgroundDots: true,
      },
      image: logo,
    })

    const svgData = await qrCode.getRawData('svg')
    if (!svgData) {
      throw new Error('Failed to generate QR code SVG')
    }

    const svgBuffer = Buffer.isBuffer(svgData)
      ? svgData
      : Buffer.from(await (svgData as Blob).arrayBuffer())

    const { Resvg } = await getResvgWasm()
    const resvg = new Resvg(new Uint8Array(svgBuffer), {
      fitTo: {
        mode: 'width',
        value: width,
      },
    })

    const pngData = resvg.render()
    const pngBytes = pngData.asPng()
    const pngBuffer = Buffer.from(pngBytes)

    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  } finally {
    globalAny.window = previousGlobals.window
    globalAny.document = previousGlobals.document
    globalAny.HTMLElement = previousGlobals.HTMLElement
    globalAny.Node = previousGlobals.Node
  }
}

export async function generateReceiptQRCode(
  receiptNumber: string,
  organizationSlug?: string
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const verifyUrl = organizationSlug
    ? `${baseUrl}/v/${organizationSlug}/${receiptNumber}`
    : `${baseUrl}/v/${receiptNumber}`

  return generateQRCodeBase64({
    data: verifyUrl,
    width: 400,
    height: 400,
    dotsType: 'rounded',
    cornersType: 'extra-rounded',
    backgroundColor: '#ffffff',
    dotsColor: '#444',
    cornersColor: '#444',
  })
}
