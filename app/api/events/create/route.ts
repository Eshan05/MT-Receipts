import dbConnect from '@/lib/db-conn'
import AEvent, { IEvent } from '@/models/event.model'
import { eventSchema } from '@/lib/schemas/event'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const body = await req.json()

    // Validate the data using the schema
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
