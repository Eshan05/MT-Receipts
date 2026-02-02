import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'
import mongoose from 'mongoose'

interface RouteParams {
  params: Promise<{ code: string }>
}

function isValidObjectId(id: string): boolean {
  return (
    mongoose.Types.ObjectId.isValid(id) &&
    new mongoose.Types.ObjectId(id).toString() === id
  )
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { code } = await params
    const token = await getTokenServer()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken || !verifiedToken.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    let invite = await MembershipRequest.findOne({
      code: code.toUpperCase(),
      status: 'pending',
    })

    if (!invite && isValidObjectId(code)) {
      invite = await MembershipRequest.findOne({
        _id: code,
        status: 'pending',
      })
    }

    if (!invite) {
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
