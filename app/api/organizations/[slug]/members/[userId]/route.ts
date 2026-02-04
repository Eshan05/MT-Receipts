import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ slug: string; userId: string }>
}

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { slug, userId } = await params
    const token = await getTokenServer()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken || !verifiedToken.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const currentUser = await User.findOne({ email: verifiedToken.email })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const adminMembership = currentUser.memberships.find(
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

    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { role } = validation.data

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetMembership = targetUser.memberships.find(
      (m) => m.organizationId.toString() === organization._id.toString()
    )
    if (!targetMembership) {
      return NextResponse.json(
        { error: 'User is not a member' },
        { status: 400 }
      )
    }

    targetMembership.role = role
    await targetUser.save()

    return NextResponse.json({ message: 'Role updated' })
  } catch (error) {
    console.error('Update member role error:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { slug, userId } = await params
    const token = await getTokenServer()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken || !verifiedToken.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const currentUser = await User.findOne({ email: verifiedToken.email })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const adminMembership = currentUser.memberships.find(
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

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    targetUser.memberships = targetUser.memberships.filter(
      (m) => m.organizationId.toString() !== organization._id.toString()
    )
    await targetUser.save()

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
