import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'

interface BulkUpdateBody {
  userIds: string[]
  role: 'admin' | 'member'
}

interface BulkDeleteBody {
  userIds: string[]
}

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    const { slug } = await params

    await dbConnect()

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const members = await User.find({
      'memberships.organizationId': organization._id,
    }).select('username email memberships lastSignIn createdAt')

    const acceptedInvites = await MembershipRequest.find({
      organizationId: organization._id,
      status: 'accepted',
      acceptedBy: { $exists: true },
    })
      .select('acceptedBy invitedBy type acceptedAt createdAt')
      .sort({ acceptedAt: -1, createdAt: -1 })
      .lean()

    const latestInviteByAcceptedUser = new Map<
      string,
      (typeof acceptedInvites)[number]
    >()
    for (const invite of acceptedInvites) {
      const acceptedById = invite.acceptedBy?.toString()
      if (!acceptedById || latestInviteByAcceptedUser.has(acceptedById)) {
        continue
      }
      latestInviteByAcceptedUser.set(acceptedById, invite)
    }

    const inviterIds = new Set<string>()
    for (const member of members) {
      const membershipData = member.memberships.find(
        (membership) =>
          membership.organizationId.toString() === organization._id.toString()
      )
      if (membershipData?.invitedBy) {
        inviterIds.add(membershipData.invitedBy.toString())
      }
    }

    for (const invite of acceptedInvites) {
      if (invite.invitedBy) {
        inviterIds.add(invite.invitedBy.toString())
      }
    }

    const inviters = inviterIds.size
      ? await User.find({ _id: { $in: Array.from(inviterIds) } })
          .select('username')
          .lean()
      : []

    const inviterNameMap = new Map<string, string>()
    for (const inviter of inviters) {
      inviterNameMap.set(inviter._id.toString(), inviter.username)
    }

    const formattedMembers = members.map((member) => {
      const orgMembership = member.memberships.find(
        (membership) =>
          membership.organizationId.toString() === organization._id.toString()
      )

      const inviteData = latestInviteByAcceptedUser.get(member._id.toString())
      const joinedVia =
        orgMembership?.joinedVia ||
        (inviteData?.type === 'code'
          ? 'invite_code'
          : inviteData?.type === 'email'
            ? 'invite_email'
            : 'manual')

      const invitedById =
        orgMembership?.invitedBy?.toString() ||
        inviteData?.invitedBy?.toString()

      return {
        userId: member._id,
        username: member.username,
        email: member.email,
        role: orgMembership?.role || 'member',
        joinedAt:
          orgMembership?.approvedAt ||
          inviteData?.acceptedAt ||
          inviteData?.createdAt ||
          member.createdAt,
        joinedVia,
        invitedById,
        invitedByName: invitedById
          ? inviterNameMap.get(invitedById)
          : undefined,
        invitedAt: orgMembership?.invitedAt || inviteData?.createdAt,
        lastSignedInAt: orgMembership?.lastSignedInAt || member.lastSignIn,
      }
    })

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Get superadmin organization members error:', error)
    return NextResponse.json(
      { error: 'Failed to get members' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    const { slug } = await params

    const body = (await request.json()) as BulkUpdateBody
    const { userIds, role } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    }

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    for (const userId of userIds) {
      await User.updateOne(
        { _id: userId, 'memberships.organizationId': organization._id },
        { $set: { 'memberships.$.role': role } }
      )
    }

    return NextResponse.json({ message: `Updated ${userIds.length} members` })
  } catch (error) {
    console.error('Bulk update superadmin members error:', error)
    return NextResponse.json(
      { error: 'Failed to update members' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    const { slug } = await params

    const body = (await request.json()) as BulkDeleteBody
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    }

    await dbConnect()

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    for (const userId of userIds) {
      await User.updateOne(
        { _id: userId },
        {
          $pull: {
            memberships: {
              organizationId: organization._id,
            },
          },
        }
      )
    }

    return NextResponse.json({ message: `Removed ${userIds.length} members` })
  } catch (error) {
    console.error('Bulk remove superadmin members error:', error)
    return NextResponse.json(
      { error: 'Failed to remove members' },
      { status: 500 }
    )
  }
}
