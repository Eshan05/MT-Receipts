import dbConnect from '@/lib/db-conn'
import AEvent from '@/models/event.model'
import { NextRequest, NextResponse } from 'next/server'

interface Context {
  params: {
    code: string
  }
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const event = await AEvent.findByEventCode(code)

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
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const body = await req.json()
    const { name, type, desc, items, tags } = body

    const event = await AEvent.findOneAndUpdate(
      { code },
      { name, type, desc, items, tags },
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
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const event = await AEvent.findOneAndUpdate(
      { code },
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
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const body = await req.json()
    const { isActive } = body

    const event = await AEvent.findOneAndUpdate(
      { code },
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
