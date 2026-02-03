import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant-route'

const PAGE_SIZE = 12

const eventSchema = z.object({
  eventCode: z
    .string()
    .min(1)
    .max(20)
    .transform((v) => v.toUpperCase()),
  type: z.enum([
    'seminar',
    'workshop',
    'conference',
    'competition',
    'meetup',
    'training',
    'webinar',
    'hackathon',
    'concert',
    'fundraiser',
    'networking',
    'internal',
    'other',
  ]),
  name: z.string().min(1).max(100),
  desc: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        price: z.number().min(0),
      })
    )
    .optional()
    .default([]),
  templateId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  maxPurchases: z.number().optional(),
  tags: z.array(z.string()).optional().default([]),
})

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event } = ctx.models
    const { searchParams } = new URL(req.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10)

    const filter: Record<string, unknown> = includeDeleted
      ? {}
      : { isActive: true }

    if (cursor) {
      const cursorEvent = await Event.findById(cursor)
        .select('createdAt')
        .lean()
      if (cursorEvent) {
        filter.createdAt = { $lt: cursorEvent.createdAt }
      }
    }

    const events = await Event.find(filter)
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
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Event } = ctx.models
    const body = await req.json()

    const validationResult = eventSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Validation Error', errors: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const existingEvent = await Event.findByEventCode(data.eventCode)
    if (existingEvent) {
      return NextResponse.json(
        { message: 'Event with this code already exists' },
        { status: 409 }
      )
    }

    const newEvent = await Event.create({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy: ctx.user.id,
    })

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
