import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { z } from 'zod'

const createMembershipSchema = z.object({
  inviteCode: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const token = await getTokenServer(request)
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

    const body = await request.json()
    const validationResult = createMembershipSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { inviteCode } = validationResult.data
    const normalizedCode = inviteCode.trim().toUpperCase()

    const invite = await MembershipRequest.findValidByCode(normalizedCode)
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 404 }
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
      organizationId: invite.organizationId,
      organizationSlug: invite.organizationSlug,
      role: invite.role,
      approvedAt: new Date(),
    })
    await user.save()

    invite.usedCount += 1
    if (invite.usedCount >= (invite.maxUses || 1)) {
      invite.status = 'accepted'
    }
    invite.acceptedBy = user._id
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
    console.error('Create membership error:', error)
    return NextResponse.json(
      { error: 'Failed to join organization' },
      { status: 500 }
    )
  }
}
