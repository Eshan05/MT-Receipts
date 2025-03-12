import dbConnect from '@/lib/db-conn'
import Purchase from '@/models/purchase.model'
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

    const counts = await Purchase.aggregate([
      {
        $match: {
          event: { $in: eventIdArray.map((id) => id) },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: {
            event: '$event',
            itemName: '$items.itemName',
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
