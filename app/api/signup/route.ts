import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import User from '@/models/userModel'
import { setAuthCookie } from '@/lib/auth'
import { z } from 'zod'

const signupSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()

    const validationResult = signupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid Input', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { username, email, password } = validationResult.data
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    const user = new User({ username, email, passhash: password })
    await user.save()

    const response = NextResponse.json(
      { message: 'User created successfully', userId: user._id },
      { status: 201 }
    )
    await setAuthCookie(email, response)

    return response
  } catch (error) {
    if (error instanceof Error) {
      console.error(error)
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
