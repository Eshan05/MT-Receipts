import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-route'

interface RouteParams {
  params: Promise<{ code: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event, Receipt } = ctx.models

    const event = await Event.findByEventCode(code)
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    const receipts = await Receipt.find({ event: event._id })
      .sort({ createdAt: -1 })
      .lean()

    const entries = receipts.map((r) => ({
      _id: r._id.toString(),
      receiptNumber: r.receiptNumber,
      customer: {
        name: r.customer.name,
        email: r.customer.email,
        phone: r.customer.phone,
        address: r.customer.address,
      },
      items: r.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totalAmount: r.totalAmount,
      paymentMethod: r.paymentMethod,
      emailSent: r.emailSent,
      emailSentAt: r.emailSentAt,
      emailError: r.emailError,
      emailLog: r.emailLog?.map((log) => ({
        sentTo: log.sentTo,
        status: log.status,
        sentAt: log.sentAt,
        error: log.error,
      })),
      pdfUrl: r.pdfUrl,
      refunded: r.refunded,
      refundReason: r.refundReason,
      refundedAt: r.refundedAt,
      notes: r.notes,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      createdBy: r.createdBy?.toString(),
    }))

    return NextResponse.json({ entries }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch event entries:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
