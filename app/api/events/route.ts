import dbConnect from '@/lib/db-conn'
import AEvent from '@/models/event.model'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    await dbConnect()

    const events = await AEvent.find({ isActive: true })
      .sort({ createdAt: -1 })
      .exec()

    return NextResponse.json({ events }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
