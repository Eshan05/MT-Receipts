import { eventSchema } from '@/app/(root)/events/create/page'
import dbConnect from '@/lib/dbConnect'
import AEvent, { IEvent } from '@/models/eventModel'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const body = await req.json()
    console.log(body)
    // const validatedData = eventSchema.safeParse(body)

    const existingEvent = await AEvent.findByEventCodeNotDeleted(body.eventCode)
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation Error', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
