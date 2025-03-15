import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import Event from '@/models/event.model'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const {
      receiptNumber,
      eventId,
      event,
      customer,
      items,
      totalAmount,
      paymentMethod,
      notes,
    } = body

    if (!receiptNumber || !eventId || !customer || !items) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingReceipt = await Receipt.findOne({ receiptNumber })
    if (existingReceipt) {
      return NextResponse.json(
        { message: 'Receipt number already exists' },
        { status: 400 }
      )
    }

    const processedItems = items.map(
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

    const receipt = await Receipt.create({
      receiptNumber,
      event: eventId,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      items: processedItems,
      totalAmount,
      paymentMethod,
      notes,
      emailSent: false,
    })

    return NextResponse.json({
      message: 'Receipt created successfully',
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        customer: receipt.customer,
        totalAmount: receipt.totalAmount,
      },
    })
  } catch (error) {
    console.error('Error creating receipt:', error)
    return NextResponse.json(
      { message: 'Failed to create receipt' },
      { status: 500 }
    )
  }
}
