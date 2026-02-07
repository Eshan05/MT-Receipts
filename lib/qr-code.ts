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

async function loadResvgWasmBytes(): Promise<Uint8Array> {
  const fsPromisesNs = await import('node:fs/promises')
  const readFileFn =
    (fsPromisesNs as any).readFile ?? (fsPromisesNs as any).default?.readFile

  if (typeof readFileFn !== 'function') {
    throw new Error('Failed to load node:fs/promises readFile()')
  }

  const moduleNs = await import('node:module')
  const createRequireFn =
    (moduleNs as any).createRequire ?? (moduleNs as any).default?.createRequire

  if (typeof createRequireFn === 'function') {
    const requireFn = createRequireFn(`${process.cwd()}/`)
    const resolveFn = (requireFn as any).resolve
    if (typeof resolveFn !== 'function') {
      throw new Error(
        'node:module createRequire() did not return a require with resolve()'
      )
    }

    const wasmPath = resolveFn.call(
      requireFn,
      '@resvg/resvg-wasm/index_bg.wasm'
    )
    return await readFileFn(wasmPath)
  }

  const globalRequire = (globalThis as any).require
  if (typeof globalRequire?.resolve === 'function') {
    const wasmPath = globalRequire.resolve('@resvg/resvg-wasm/index_bg.wasm')
    return await readFileFn(wasmPath)
  }

  throw new Error('Unable to resolve @resvg/resvg-wasm WASM file path')
}

async function getResvgWasm() {
  const mod = await import('@resvg/resvg-wasm')

  const initWasmFn = (mod as any).initWasm ?? (mod as any).default?.initWasm
  const ResvgClass = (mod as any).Resvg ?? (mod as any).default?.Resvg

  if (typeof initWasmFn !== 'function' || typeof ResvgClass !== 'function') {
    throw new Error('Failed to load @resvg/resvg-wasm exports')
  }

  if (!resvgWasmInit) {
    resvgWasmInit = (async () => {
      const wasmBytes = await loadResvgWasmBytes()
      await initWasmFn(wasmBytes)
    })()
  }

  await resvgWasmInit
  return { Resvg: ResvgClass as typeof mod.Resvg }
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

  const [{ default: QRCodeStyling }, { Window }] = await Promise.all([
    import('qr-code-styling'),
    import('happy-dom'),
  ])

  const window = new Window()

  const globalAny = global as any
  const previousGlobals = {
    window: globalAny.window,
    document: globalAny.document,
    HTMLElement: globalAny.HTMLElement,
    Node: globalAny.Node,
    XMLSerializer: globalAny.XMLSerializer,
    btoa: globalAny.btoa,
  }

  try {
    globalAny.window = window
    globalAny.document = window.document
    globalAny.HTMLElement = window.HTMLElement
    globalAny.Node = window.Node
    globalAny.XMLSerializer = window.XMLSerializer
    // qr-code-styling uses global `btoa()` when creating a data: URL.
    globalAny.btoa =
      typeof globalAny.btoa === 'function'
        ? globalAny.btoa
        : (data: string) => Buffer.from(data, 'binary').toString('base64')

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
    globalAny.XMLSerializer = previousGlobals.XMLSerializer
    globalAny.btoa = previousGlobals.btoa
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
