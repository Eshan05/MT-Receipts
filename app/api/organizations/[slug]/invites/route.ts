import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params
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

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const membership = user.memberships.find(
      (m) =>
        m.organizationId.toString() === organization._id.toString() &&
        m.role === 'admin'
    )
    if (!membership) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const invites = await MembershipRequest.find({
      organizationId: organization._id,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .lean()

    const inviterIds = Array.from(
      new Set(
        invites
          .map((invite) => invite.invitedBy?.toString())
          .filter((id): id is string => Boolean(id))
      )
    )

    const inviters = inviterIds.length
      ? await User.find({ _id: { $in: inviterIds } })
          .select('username')
          .lean()
      : []

    const inviterNameMap = new Map<string, string>()
    for (const inviter of inviters) {
      inviterNameMap.set(inviter._id.toString(), inviter.username)
    }

    return NextResponse.json({
      invites: invites.map((invite) => ({
        _id: invite._id,
        type: invite.type,
        email: invite.email,
        code: invite.code,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
        invitedById: invite.invitedBy,
        invitedByName: invite.invitedBy
          ? inviterNameMap.get(invite.invitedBy.toString())
          : undefined,
      })),
    })
  } catch (error) {
    console.error('Get organization invites error:', error)
    return NextResponse.json(
      { error: 'Failed to get invites' },
      { status: 500 }
    )
  }
}
