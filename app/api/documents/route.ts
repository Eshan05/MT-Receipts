import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { renderReceiptPDF, streamToBuffer } from '@/lib/pdf/template-renderer'
import { ensureQrPngIsRgbDataUrl } from '@/lib/qr-code-data'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const body = await request.json()
    const {
      receiptNumber,
      customer,
      event,
      items,
      taxes,
      totalAmount,
      paymentMethod,
      date,
      notes,
      templateSlug,
      config,
    } = body

    if (!receiptNumber || !customer || !event || !items) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    let qrCodeData: string | undefined
    if (config?.showQrCode) {
      const { generateReceiptQRCode } = await import('@/lib/qr-code')
      qrCodeData = await generateReceiptQRCode(
        receiptNumber,
        ctx.organization.slug
      )

      const rgbQr = await ensureQrPngIsRgbDataUrl(qrCodeData)
      if (rgbQr) qrCodeData = rgbQr
    }

    type ProcessedItem = {
      name: string
      description?: string
      quantity: number
      price: number
      total: number
    }

    const processedItems: ProcessedItem[] = (
      Array.isArray(items) ? items : []
    ).map(
      (item: {
        name: string
        description?: string
        quantity: number
        price: number
      }) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
      })
    )

    const subtotal = processedItems.reduce(
      (sum: number, item) => sum + item.total,
      0
    )

    const processedTaxes = Array.isArray(taxes)
      ? taxes
          .filter((t: any) => t && typeof t.name === 'string')
          .map((t: any) => {
            const rate = Number(t.rate) || 0
            const amount = Number.isFinite(rate) ? (subtotal * rate) / 100 : 0
            return { name: String(t.name), rate, amount }
          })
      : undefined

    const computedTotalAmount =
      subtotal +
      (processedTaxes?.reduce((sum, tax) => sum + tax.amount, 0) || 0)

    const result = await renderReceiptPDF({
      receiptNumber,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      event: {
        _id: event._id || '',
        name: event.name,
        code: event.code || '',
        type: event.type || 'other',
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        templateId: templateSlug,
      },
      items: processedItems,
      taxes: processedTaxes,
      totalAmount: Number.isFinite(computedTotalAmount)
        ? computedTotalAmount
        : totalAmount,
      paymentMethod,
      date,
      notes,
      qrCodeData,
      customConfig: config,
    })

    const buffer = await streamToBuffer(result.stream)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { message: 'Failed to generate document' },
      { status: 500 }
    )
  }
}
