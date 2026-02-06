import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'

interface RouteParams {
  params: Promise<{ code: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event } = ctx.models
    const event = await Event.findByEventCode(code)

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event } = ctx.models
    const body = await req.json()
    const { name, type, desc, items, tags } = body

    const event = await Event.findOneAndUpdate(
      { eventCode: code.toUpperCase() },
      { name, type, desc, items, tags },
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error('Failed to update event:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event } = ctx.models
    const event = await Event.findOneAndUpdate(
      { eventCode: code.toUpperCase() },
      { isActive: false },
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { message: 'Event code is required' },
        { status: 400 }
      )
    }

    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event } = ctx.models
    const body = await req.json()
    const { isActive } = body

    const event = await Event.findOneAndUpdate(
      { eventCode: code.toUpperCase() },
      { isActive },
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event }, { status: 200 })
  } catch (error) {
    console.error('Failed to restore event:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
