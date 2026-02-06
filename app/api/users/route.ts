import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import { setAuthCookie } from '@/lib/auth/auth'
import { z } from 'zod'

const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === 'true') {
      return NextResponse.json(
        { error: 'Sign up is currently disabled' },
        { status: 403 }
      )
    }

    await dbConnect()
    const body = await request.json()

    const validationResult = createUserSchema.safeParse(body)
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

    const hashedPassword = await User.hashPassword(password)
    const user = new User({ username, email, passhash: hashedPassword })
    await user.save()

    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    )
    await setAuthCookie(email, response)

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
