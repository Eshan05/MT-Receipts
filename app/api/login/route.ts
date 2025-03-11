import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import User from '@/models/userModel'
import { setAuthCookie } from '@/lib/auth'
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

    user.lastLogin = new Date()
    await user.save()

    const response = NextResponse.json(
      { message: 'Authenticated successfully' },
      { status: 200 }
    )
    await setAuthCookie(email, response)
    return response
  } catch (error: any) {
    console.error(error)
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    )
  }
}
