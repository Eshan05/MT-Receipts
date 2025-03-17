import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventIds = searchParams.get('eventIds')

    if (!eventIds) {
      return NextResponse.json({ counts: {} }, { status: 200 })
    }

    const eventIdArray = eventIds.split(',')

    await dbConnect()

    const counts = await Receipt.aggregate([
      {
        $match: {
          event: { $in: eventIdArray.map((id) => id) },
          refunded: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
        },
      },
    ])

    const result: Record<string, number> = {}
    counts.forEach((item) => {
      result[item._id.toString()] = item.count
    })

    return NextResponse.json({ counts: result }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch entry counts:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
