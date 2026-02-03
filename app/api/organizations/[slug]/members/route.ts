import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'

interface RouteParams {
  params: Promise<{ slug: string }>
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
