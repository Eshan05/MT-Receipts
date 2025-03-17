import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import Sequence from '@/models/sequence.model'

async function generateReceiptNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')

  const sequence = await Sequence.findOneAndUpdate(
    { name: 'receipt' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  )

  const sequenceNumber = sequence.value.toString().padStart(4, '0')
  return `RCP-${year}${month}-${sequenceNumber}`
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const {
      eventId,
      customer,
      items,
      totalAmount,
      paymentMethod,
      emailSent,
      sendEmail,
      notes,
    } = body

    if (!eventId || !customer || !items) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const receiptNumber = await generateReceiptNumber()

    const processedItems = items.map(
      (item: {
        name: string
        description?: string
        quantity: number
        price: number
        total?: number
      }) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total || item.quantity * item.price,
      })
    )

    const shouldSendEmail = sendEmail && !emailSent

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
      emailSent: emailSent || false,
      emailSentAt: emailSent ? new Date() : undefined,
      notes,
    })

    // If sendEmail is true, trigger email sending
    if (shouldSendEmail) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/receipts/${receiptNumber}/send-email`,
          { method: 'POST' }
        )
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        // Don't fail the request if email fails
      }
    }

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
