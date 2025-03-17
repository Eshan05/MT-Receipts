import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  try {
    await dbConnect()
    const { receiptNumber } = await params

    const receipt = await Receipt.findOne({ receiptNumber })
      .populate('event', 'name eventCode type')
      .populate('createdBy', 'name email')

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ receipt })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json(
      { message: 'Failed to fetch receipt' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  try {
    await dbConnect()
    const { receiptNumber } = await params
    const body = await request.json()

    const {
      customer,
      items,
      totalAmount,
      paymentMethod,
      emailSent,
      notes,
      refunded,
      refundReason,
      status,
      createdAt,
      emailSentAt,
    } = body

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

    const updateData: Record<string, unknown> = {
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      items: processedItems,
      totalAmount,
      paymentMethod,
      emailSent,
      notes,
    }

    if (emailSent !== undefined) {
      updateData.emailSent = emailSent
    }

    if (refunded !== undefined) {
      updateData.refunded = refunded
      updateData.refundedAt = refunded ? new Date() : undefined
    }
    if (refundReason !== undefined) {
      updateData.refundReason = refundReason
    }

    if (status === 'refunded') {
      updateData.refunded = true
      updateData.refundedAt = new Date()
    } else if (status === 'sent') {
      updateData.emailSent = true
      updateData.emailSentAt = emailSentAt ? new Date(emailSentAt) : new Date()
    } else if (status === 'failed') {
      updateData.emailSent = false
      updateData.emailError = 'Marked as failed manually'
    } else if (status === 'pending') {
      updateData.emailSent = false
      updateData.emailError = undefined
    }

    if (createdAt) {
      updateData.createdAt = new Date(createdAt)
    }
    if (emailSentAt !== undefined) {
      updateData.emailSentAt = emailSentAt ? new Date(emailSentAt) : undefined
    }

    const receipt = await Receipt.findOneAndUpdate(
      { receiptNumber },
      updateData,
      { new: true }
    )

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Receipt updated successfully',
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        customer: receipt.customer,
        totalAmount: receipt.totalAmount,
      },
    })
  } catch (error) {
    console.error('Error updating receipt:', error)
    return NextResponse.json(
      { message: 'Failed to update receipt' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  try {
    await dbConnect()
    const { receiptNumber } = await params

    const receipt = await Receipt.findOneAndDelete({ receiptNumber })

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Receipt deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json(
      { message: 'Failed to delete receipt' },
      { status: 500 }
    )
  }
}
