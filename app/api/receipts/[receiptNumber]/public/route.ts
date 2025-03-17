import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import Event from '@/models/event.model'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  try {
    await dbConnect()
    const { receiptNumber } = await params

    const receipt = await Receipt.findOne({ receiptNumber })
      .populate('event', 'name eventCode type location startDate endDate')
      .lean()

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found', valid: false },
        { status: 404 }
      )
    }

    const event = receipt.event as any

    return NextResponse.json({
      valid: true,
      receipt: {
        receiptNumber: receipt.receiptNumber,
        customer: {
          name: receipt.customer.name,
          email: receipt.customer.email,
          phone: receipt.customer.phone,
          address: receipt.customer.address,
        },
        items: receipt.items.map((item: any) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        totalAmount: receipt.totalAmount,
        paymentMethod: receipt.paymentMethod,
        notes: receipt.notes,
        refunded: receipt.refunded,
        refundReason: receipt.refundReason,
        emailSent: receipt.emailSent,
        createdAt: receipt.createdAt,
      },
      event: event
        ? {
            name: event.name,
            eventCode: event.eventCode,
            type: event.type,
            location: event.location,
            startDate: event.startDate,
            endDate: event.endDate,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching public receipt:', error)
    return NextResponse.json(
      { message: 'Failed to fetch receipt', valid: false },
      { status: 500 }
    )
  }
}
