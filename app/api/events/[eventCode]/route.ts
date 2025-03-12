import dbConnect from '@/lib/db-conn'
import AEvent from '@/models/event.model'
import { NextRequest, NextResponse } from 'next/server'

interface Context {
  params: {
    eventCode: string
  }
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { eventCode } = await params

    if (!eventCode) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const event = await AEvent.findByEventCode(eventCode)

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error(`Failed to fetch event:`, error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
