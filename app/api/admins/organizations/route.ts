import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { getSuperAdminContext } from '@/lib/superadmin-route'

export async function GET(request: NextRequest) {
  const superAdmin = await getSuperAdminContext()
  if (superAdmin instanceof NextResponse) return superAdmin

  await dbConnect()

  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state')
  const search = searchParams.get('search')?.trim()
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get('limit') || 20))
  )

  const filter: Record<string, unknown> = {}

  if (state && ['pending', 'active', 'suspended', 'deleted'].includes(state)) {
    filter.status = state
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ]
  }

  const [total, organizations] = await Promise.all([
    Organization.countDocuments(filter),
    Organization.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ])

  const creatorIds = Array.from(
    new Set(
      organizations
        .map((organization) => organization.createdBy?.toString())
        .filter((value): value is string => Boolean(value))
    )
  )

  const approverIds = Array.from(
    new Set(
      organizations
        .map((organization) => organization.approvedBy?.toString())
        .filter((value): value is string => Boolean(value))
    )
  )

  const relatedUserIds = Array.from(new Set([...creatorIds, ...approverIds]))

  const relatedUsers = relatedUserIds.length
    ? await User.find({ _id: { $in: relatedUserIds } })
        .select('username email')
        .lean()
    : []

  const userMap = new Map(
    relatedUsers.map((relatedUser) => [relatedUser._id.toString(), relatedUser])
  )

  const withCounts = await Promise.all(
    organizations.map(async (organization) => {
      const memberCount = await User.countDocuments({
        'memberships.organizationId': organization._id,
      })

      const createdBy = userMap.get(organization.createdBy?.toString())
      const approvedByKey = organization.approvedBy?.toString()
      const approvedBy = approvedByKey ? userMap.get(approvedByKey) : undefined

      return {
        id: organization._id.toString(),
        slug: organization.slug,
        name: organization.name,
        description: organization.description,
        expectedMembers: organization.expectedMembers,
        logoUrl: organization.logoUrl,
        status: organization.status,
        limits: organization.limits,
        settings: organization.settings,
        memberCount,
        createdAt: organization.createdAt,
        approvedAt: organization.approvedAt,
        approvedBy: approvedBy
          ? {
              id: approvedBy._id.toString(),
              username: approvedBy.username,
              email: approvedBy.email,
            }
          : null,
        deletedAt: organization.deletedAt,
        restoresBefore: organization.restoresBefore,
        createdBy: createdBy
          ? {
              id: createdBy._id.toString(),
              username: createdBy.username,
              email: createdBy.email,
            }
          : null,
      }
    })
  )

  return NextResponse.json({
    organizations: withCounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  })
}
