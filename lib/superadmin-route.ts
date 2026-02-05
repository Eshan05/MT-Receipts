import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'

export interface SuperAdminContext {
  user: {
    id: string
    email: string
    username: string
  }
}

export async function getSuperAdminContext(): Promise<
  SuperAdminContext | NextResponse
> {
  const token = await getTokenServer()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const verifiedToken = await verifyAuthToken(token)
  if (!verifiedToken || !verifiedToken.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()
  const user = await User.findOne({ email: verifiedToken.email })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Super admin access required' },
      { status: 403 }
    )
  }

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    },
  }
}
