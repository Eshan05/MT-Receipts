import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import Event from '@/models/event.model'
import { renderReceiptPDF, streamToBuffer } from '@/lib/pdf/template-renderer'

export async function GET(
  request: NextRequest,
  { params }: { params: { receiptNumber: string } }
) {
  try {
    const { receiptNumber } = await params

    if (!receiptNumber) {
      return NextResponse.json(
        { message: 'Receipt number is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const receipt = await Receipt.findOne({ receiptNumber }).lean()
    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    const event = await Event.findById(receipt.event).lean()
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    let qrCodeData: string | undefined = receipt.qrCodeData
    if (!qrCodeData) {
      const { generateReceiptQRCode } = await import('@/lib/qr-code')
      qrCodeData = await generateReceiptQRCode(receiptNumber, 'ACES')
    }

    const result = await renderReceiptPDF({
      receiptNumber: receipt.receiptNumber,
      customer: {
        name: receipt.customer.name,
        email: receipt.customer.email,
        phone: receipt.customer.phone,
        address: receipt.customer.address,
      },
      event: {
        _id: event._id?.toString() || '',
        name: event.name,
        code: event.eventCode || '',
        type: event.type || 'other',
        location: event.location,
        startDate: event.startDate?.toISOString(),
        endDate: event.endDate?.toISOString(),
        templateId: receipt.templateSlug,
      },
      items: receipt.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totalAmount: receipt.totalAmount,
      paymentMethod: receipt.paymentMethod,
      date: receipt.createdAt?.toISOString(),
      notes: receipt.notes,
      qrCodeData,
    })

    const buffer = await streamToBuffer(result.stream)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { message: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
