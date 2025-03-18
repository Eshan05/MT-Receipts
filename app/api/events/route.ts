import dbConnect from '@/lib/db-conn'
import AEvent, { IEvent } from '@/models/event.model'
import { eventSchema } from '@/lib/schemas/event'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const PAGE_SIZE = 12

export async function GET(req: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(req.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10)

    const filter: Record<string, unknown> = includeDeleted
      ? {}
      : { isActive: true }

    if (cursor) {
      const cursorEvent = await AEvent.findById(cursor)
        .select('createdAt')
        .lean()
      if (cursorEvent) {
        filter.createdAt = { $lt: cursorEvent.createdAt }
      }
    }

    const events = await AEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec()

    const hasMore = events.length > limit
    const paginatedEvents = hasMore ? events.slice(0, limit) : events
    const nextCursor = hasMore
      ? paginatedEvents[paginatedEvents.length - 1]?._id?.toString()
      : null

    return NextResponse.json(
      { events: paginatedEvents, nextCursor, hasMore },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const body = await req.json()

    try {
      eventSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { message: 'Validation Error', errors: validationError.issues },
          { status: 400 }
        )
      }
      throw validationError
    }

    const existingEvent = await AEvent.findByEventCode(body.eventCode)
    if (existingEvent) {
      return NextResponse.json(
        { message: 'Event with this code already exists' },
        { status: 409 }
      )
    }

    const newEvent: IEvent = new AEvent(body)
    await newEvent.save()

    return NextResponse.json(
      { message: 'Event created successfully', event: newEvent },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
