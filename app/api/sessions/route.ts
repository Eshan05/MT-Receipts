import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import {
  setAuthCookie,
  clearAuthCookie,
  verifyAuthToken,
  getTokenServer,
} from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }
    const { email, password } = validationResult.data

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const passwordMatch = await User.comparePassword(password, user.passhash)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    user.lastSignIn = new Date()
    await user.save()

    const response = NextResponse.json(
      {
        message: 'Session created',
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
    console.error('Login error:', error)
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const token = await getTokenServer()

    if (!token || token.trim() === '') {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    await dbConnect()
    const user = await User.findOne({ email: verifiedToken.email }).select(
      'username email'
    )

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    })
  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { message: 'Session destroyed' },
    { status: 200 }
  )
  await clearAuthCookie(response)
  return response
}
