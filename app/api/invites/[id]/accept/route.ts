import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'

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

    const user = await User.findOne({ email: verifiedToken.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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

    const organization = await Organization.findById(invite.organizationId)
    if (!organization || organization.status !== 'active') {
      return NextResponse.json(
        { error: 'Organization not available' },
        { status: 404 }
      )
    }

    const existingMembership = user.memberships.find(
      (m) => m.organizationId.toString() === invite.organizationId.toString()
    )

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      )
    }

    user.memberships.push({
      organizationId: invite.organizationId as any,
      organizationSlug: invite.organizationSlug,
      role: invite.role,
      approvedAt: new Date(),
    })
    await user.save()

    invite.status = 'accepted'
    invite.acceptedBy = user._id as any
    invite.acceptedAt = new Date()
    await invite.save()

    return NextResponse.json({
      message: `Successfully joined ${organization.name}`,
      organization: {
        id: organization._id,
        slug: organization.slug,
        name: organization.name,
      },
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
