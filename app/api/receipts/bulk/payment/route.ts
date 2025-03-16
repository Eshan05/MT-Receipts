import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const { receiptNumbers, paymentMethod } = body

    if (!receiptNumbers || !Array.isArray(receiptNumbers)) {
      return NextResponse.json(
        { message: 'Invalid receipt numbers' },
        { status: 400 }
      )
    }

    if (!['cash', 'upi', 'card', 'other'].includes(paymentMethod)) {
      return NextResponse.json(
        { message: 'Invalid payment method' },
        { status: 400 }
      )
    }

    const result = await Receipt.updateMany(
      { receiptNumber: { $in: receiptNumbers } },
      { paymentMethod }
    )

    return NextResponse.json({
      message: `Updated payment method for ${result.modifiedCount} entries`,
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Error updating payment method:', error)
    return NextResponse.json(
      { message: 'Failed to update payment method' },
      { status: 500 }
    )
  }
}
