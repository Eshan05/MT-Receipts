import dbConnect from '@/lib/db-conn'
import Event from '@/models/event.model'
import Receipt from '@/models/receipt.model'
import { NextRequest, NextResponse } from 'next/server'
import { EventEntry } from '@/components/table/event-entries/schema'

interface Context {
  params: {
    eventCode: string
  }
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { eventCode } = await params

    if (!eventCode) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const event = await Event.findByEventCode(eventCode)
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    const eventId = event._id

    const receipts = await Receipt.find({ event: eventId })
      .sort({ createdAt: -1 })
      .lean()

    const entries: EventEntry[] = receipts.map((r) => ({
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
      createdAt: r.createdAt,
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
