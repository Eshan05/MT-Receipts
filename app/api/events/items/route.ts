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
        $unwind: '$items',
      },
      {
        $group: {
          _id: {
            event: '$event',
            itemName: '$items.name',
          },
          count: { $sum: '$items.quantity' },
        },
      },
    ])

    const result: Record<string, Record<string, number>> = {}
    counts.forEach((item) => {
      const eventId = item._id.event.toString()
      if (!result[eventId]) {
        result[eventId] = {}
      }
      result[eventId][item._id.itemName] = item.count
    })

    return NextResponse.json({ counts: result }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch item counts:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
