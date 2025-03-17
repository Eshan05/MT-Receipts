import { QRCodeCanvas } from '@loskir/styled-qr-code-node'

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
  } = options

  const qrCode = new QRCodeCanvas({
    width,
    height,
    data,
    margin,
    dotsOptions: {
      color: dotsColor,
      type: dotsType,
    },
    backgroundOptions: {
      color: backgroundColor,
    },
    cornersSquareOptions: {
      type: cornersType,
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
    qrOptions: {
      errorCorrectionLevel: logo ? 'H' : 'M',
    },
    image: logo,
  })

  const dataUrl = await qrCode.toDataUrl('png')
  return dataUrl
}

export async function generateReceiptQRCode(
  receiptNumber: string,
  organizationName?: string
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/v/${receiptNumber}`

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
