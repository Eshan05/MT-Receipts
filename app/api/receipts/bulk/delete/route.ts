import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'

export async function DELETE(request: NextRequest) {
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

    const result = await Receipt.deleteMany({
      receiptNumber: { $in: receiptNumbers },
    })

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} entries`,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error('Error deleting receipts:', error)
    return NextResponse.json(
      { message: 'Failed to delete receipts' },
      { status: 500 }
    )
  }
}
