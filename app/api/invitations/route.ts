import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'
import MembershipRequest from '@/models/membership-request.model'
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
        (o) => o._id.toString() === invite.organizationId.toString()
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

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
