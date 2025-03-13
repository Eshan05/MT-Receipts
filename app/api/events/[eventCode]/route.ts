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

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { eventCode } = await params

    if (!eventCode) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const body = await req.json()
    const { name, type, desc, items } = body

    const event = await AEvent.findOneAndUpdate(
      { eventCode },
      { name, type, desc, items },
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error(`Failed to update event:`, error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { eventCode } = await params

    if (!eventCode) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const event = await AEvent.findOneAndUpdate(
      { eventCode },
      { isActive: false },
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error(`Failed to delete event:`, error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const { eventCode } = await params

    if (!eventCode) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const body = await req.json()
    const { isActive } = body

    const event = await AEvent.findOneAndUpdate(
      { eventCode },
      { isActive },
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error(`Failed to restore event:`, error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
