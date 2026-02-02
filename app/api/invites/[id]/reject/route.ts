import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const token = await getTokenServer()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken || !verifiedToken.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const invite = await MembershipRequest.findById(id)
    if (!invite || invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation not found or already processed' },
        { status: 404 }
      )
    }

    if (invite.type === 'email' && invite.email !== verifiedToken.email) {
      return NextResponse.json(
        { error: 'This invitation is not for you' },
        { status: 403 }
      )
    }

    invite.status = 'cancelled'
    await invite.save()

    return NextResponse.json({ message: 'Invitation rejected' })
  } catch (error) {
    console.error('Reject invite error:', error)
    return NextResponse.json(
      { error: 'Failed to reject invitation' },
      { status: 500 }
    )
  }
}
