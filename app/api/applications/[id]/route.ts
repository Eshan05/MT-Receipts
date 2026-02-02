import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const application = await MembershipRequest.findById(id)
    if (!application || application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Application not found or already processed' },
        { status: 404 }
      )
    }

    if (application.email !== verifiedToken.email) {
      return NextResponse.json(
        { error: 'This application does not belong to you' },
        { status: 403 }
      )
    }

    application.status = 'cancelled'
    await application.save()

    return NextResponse.json({ message: 'Application withdrawn' })
  } catch (error) {
    console.error('Withdraw application error:', error)
    return NextResponse.json(
      { error: 'Failed to withdraw application' },
      { status: 500 }
    )
  }
}
