import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
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
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    const { slug, userId } = await params

    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    await dbConnect()

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetMembership = targetUser.memberships.find(
      (membership) =>
        membership.organizationId.toString() === organization._id.toString()
    )

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'User is not a member' },
        { status: 400 }
      )
    }

    targetMembership.role = validation.data.role
    await targetUser.save()

    return NextResponse.json({ message: 'Role updated' })
  } catch (error) {
    console.error('Update superadmin member role error:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    const { slug, userId } = await params

    await dbConnect()

    const organization = await Organization.findOne({ slug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    targetUser.memberships = targetUser.memberships.filter(
      (membership) =>
        membership.organizationId.toString() !== organization._id.toString()
    )

    await targetUser.save()

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Remove superadmin member error:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
