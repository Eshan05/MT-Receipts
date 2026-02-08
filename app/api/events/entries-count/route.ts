import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { Types } from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req)
    if (ctx instanceof NextResponse) return ctx

    const { Receipt } = ctx.models
    const { searchParams } = new URL(req.url)
    const eventIds = searchParams.get('eventIds')

    if (!eventIds) {
      return NextResponse.json({ counts: {} }, { status: 200 })
    }

    const eventObjectIds = eventIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id))

    if (eventObjectIds.length === 0) {
      return NextResponse.json({ counts: {} }, { status: 200 })
    }

    const counts = await Receipt.aggregate([
      {
        $match: {
          event: { $in: eventObjectIds },
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
