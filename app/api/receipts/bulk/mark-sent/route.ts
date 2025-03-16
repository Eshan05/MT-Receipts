import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const { receiptNumbers } = body

    if (!receiptNumbers || !Array.isArray(receiptNumbers)) {
      return NextResponse.json(
        { message: 'Invalid receipt numbers' },
        { status: 400 }
      )
    }

    const result = await Receipt.updateMany(
      {
        receiptNumber: { $in: receiptNumbers },
        emailSent: false,
      },
      {
        emailSent: true,
        emailSentAt: new Date(),
      }
    )

    return NextResponse.json({
      message: `Marked ${result.modifiedCount} entries as sent`,
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Error marking as sent:', error)
    return NextResponse.json(
      { message: 'Failed to mark as sent' },
      { status: 500 }
    )
  }
}
