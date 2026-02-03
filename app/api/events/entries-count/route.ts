import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-route'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Receipt } = ctx.models
    const { searchParams } = new URL(req.url)
    const eventIds = searchParams.get('eventIds')

    if (!eventIds) {
      return NextResponse.json({ counts: {} }, { status: 200 })
    }

    const eventIdArray = eventIds.split(',')

    const counts = await Receipt.aggregate([
      {
        $match: {
          event: { $in: eventIdArray },
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
