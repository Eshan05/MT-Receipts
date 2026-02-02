import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
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

    const user = await User.findOne({ email: verifiedToken.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = 'expired'
      await invite.save()
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    if (
      invite.type === 'code' &&
      invite.maxUses &&
      invite.usedCount >= invite.maxUses
    ) {
      return NextResponse.json(
        { error: 'This invite has reached its maximum uses' },
        { status: 410 }
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
      (m) => m.organizationId.toString() === invite!.organizationId.toString()
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

    invite.usedCount += 1
    if (
      invite.type === 'code' &&
      invite.maxUses &&
      invite.usedCount >= invite.maxUses
    ) {
      invite.status = 'accepted'
    }
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
