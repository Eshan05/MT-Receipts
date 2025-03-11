import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import User from '@/models/userModel'
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()
    const validationResult = userSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }
    const { email } = validationResult.data

    const user = await User.findOne({ email }).select('username email')
    if (!user)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: 'Internal Server Error', error: error.message },
        { status: 500 }
      )
    } else {
      return NextResponse.json(
        { message: 'Internal Server Error', error: 'Unknown error' },
        { status: 500 }
      )
    }
  }
}
