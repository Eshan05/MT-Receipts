import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  const superAdmin = await getSuperAdminContext()
  if (superAdmin instanceof NextResponse) return superAdmin

  await dbConnect()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get('limit') || 20))
  )

  const filter: Record<string, unknown> = {}
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select(
        'username email isSuperAdmin memberships isActive lastSignIn createdAt'
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ])

  const organizationIds = Array.from(
    new Set(
      users
        .flatMap((user) => user.memberships || [])
        .map((membership) => membership.organizationId?.toString())
        .filter((value): value is string => Boolean(value))
    )
  )

  const validOrganizationIds = organizationIds.filter((id) =>
    mongoose.isValidObjectId(id)
  )

  const organizations = validOrganizationIds.length
    ? await Organization.find({ _id: { $in: validOrganizationIds } })
        .select('name slug description')
        .lean()
    : []

  const organizationMap = new Map(
    organizations.map((organization) => [
      organization._id.toString(),
      organization,
    ])
  )

  return NextResponse.json({
    users: users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isSuperAdmin: !!user.isSuperAdmin,
      isActive: user.isActive,
      memberships: user.memberships?.map((membership) => {
        const organizationId = membership.organizationId.toString()
        const organization = organizationMap.get(organizationId)

        return {
          organizationId,
          organizationSlug: membership.organizationSlug,
          organizationName: organization?.name || null,
          organizationDescription: organization?.description || null,
          role: membership.role,
          approvedAt: membership.approvedAt,
          joinedVia: membership.joinedVia,
        }
      }),
      organizationNames:
        user.memberships
          ?.map(
            (membership) =>
              organizationMap.get(membership.organizationId.toString())?.name
          )
          .filter((value): value is string => Boolean(value)) || [],
      organizationSlugs:
        user.memberships?.map((membership) => membership.organizationSlug) ||
        [],
      membershipCount: user.memberships?.length || 0,
      lastSignIn: user.lastSignIn,
      createdAt: user.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  })
}
