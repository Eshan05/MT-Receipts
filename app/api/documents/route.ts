import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-route'
import { renderReceiptPDF, streamToBuffer } from '@/lib/pdf/template-renderer'

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
        config.organizationName || ctx.organization.name
      )
    }

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
      items: items.map(
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
      ),
      totalAmount,
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
