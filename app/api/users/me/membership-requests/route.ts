import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'

export async function GET() {
  try {
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

    const emailInvites = await MembershipRequest.find({
      email: verifiedToken.email,
      type: 'email',
      status: 'pending',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    })

    const orgIds = emailInvites.map((i) => i.organizationId)
    const orgs = await Organization.find({ _id: { $in: orgIds } })

    const invitations = emailInvites.map((invite) => {
      const org = orgs.find(
        (o: any) => o._id.toString() === invite.organizationId.toString()
      )
      return {
        id: invite._id,
        organizationId: invite.organizationId.toString(),
        organizationSlug: invite.organizationSlug,
        organizationName: org?.name || 'Unknown',
        organizationLogo: org?.logoUrl,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }
    })

    const applications: any[] = []

    return NextResponse.json({
      invitations,
      applications,
    })
  } catch (error) {
    console.error('Error fetching membership requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch membership requests' },
      { status: 500 }
    )
  }
}
