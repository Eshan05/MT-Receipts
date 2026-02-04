import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'

interface RouteParams {
  params: Promise<{ slug: string }>
}

interface BulkUpdateBody {
  userIds: string[]
  role: 'admin' | 'member'
}

interface BulkDeleteBody {
  userIds: string[]
}

export async function GET(request: Request, { params }: RouteParams) {
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
      (m) => m.organizationId.toString() === organization._id.toString()
    )
    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const members = await User.find({
      'memberships.organizationId': organization._id,
    }).select('username email memberships')

    const formattedMembers = members.map((member) => {
      const orgMembership = member.memberships.find(
        (m) => m.organizationId.toString() === organization._id.toString()
      )
      return {
        userId: member._id,
        username: member.username,
        email: member.email,
        role: orgMembership?.role || 'member',
        joinedAt: orgMembership?.approvedAt,
      }
    })

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json(
      { error: 'Failed to get members' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const adminMembership = user.memberships.find(
      (m) =>
        m.organizationId.toString() === organization._id.toString() &&
        m.role === 'admin'
    )
    if (!adminMembership) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

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

    for (const userId of userIds) {
      await User.updateOne(
        { _id: userId, 'memberships.organizationId': organization._id },
        { $set: { 'memberships.$.role': role } }
      )
    }

    return NextResponse.json({ message: `Updated ${userIds.length} members` })
  } catch (error) {
    console.error('Bulk update members error:', error)
    return NextResponse.json(
      { error: 'Failed to update members' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const adminMembership = user.memberships.find(
      (m) =>
        m.organizationId.toString() === organization._id.toString() &&
        m.role === 'admin'
    )
    if (!adminMembership) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as BulkDeleteBody
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    }

    if (userIds.includes(user._id.toString())) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      )
    }

    await User.updateMany(
      { _id: { $in: userIds } },
      { $pull: { memberships: { organizationId: organization._id } } }
    )

    return NextResponse.json({ message: `Removed ${userIds.length} members` })
  } catch (error) {
    console.error('Bulk remove members error:', error)
    return NextResponse.json(
      { error: 'Failed to remove members' },
      { status: 500 }
    )
  }
}
