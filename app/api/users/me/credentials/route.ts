import { NextResponse } from 'next/server'
import { z } from 'zod'

import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'

const updateCredentialsSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, { error: 'Current password is required' }),
    newPassword: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters' })
      .max(48, { error: 'Password must be at most 48 characters' })
      .regex(/[A-Z]/, {
        error: 'Password must contain at least one uppercase letter',
      })
      .regex(/[a-z]/, {
        error: 'Password must contain at least one lowercase letter',
      })
      .regex(/[0-9]/, { error: 'Password must contain at least one number' })
      .regex(/[!@#$%^&*]/, {
        error: 'Password must contain at least one special character',
      }),
    confirmPassword: z
      .string()
      .min(8, { error: 'Confirm Password must be at least 8 characters' })
      .max(48, { error: 'Confirm Password must be at most 48 characters' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export async function PATCH(request: Request) {
  try {
    const token = await getTokenServer(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateCredentialsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    await dbConnect()

    const user = await User.findOne({ email: verifiedToken.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { currentPassword, newPassword } = parsed.data

    const currentPasswordMatch = await User.comparePassword(
      currentPassword,
      user.passhash
    )

    if (!currentPasswordMatch) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    const isSameAsOld = await User.comparePassword(newPassword, user.passhash)
    if (isSameAsOld) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    user.passhash = await User.hashPassword(newPassword)
    await user.save()

    return NextResponse.json({ message: 'Credentials updated successfully' })
  } catch (error) {
    console.error('Credentials update error:', error)
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    )
  }
}
