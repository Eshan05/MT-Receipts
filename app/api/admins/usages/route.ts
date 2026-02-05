import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getSuperAdminContext } from '@/lib/superadmin-route'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import {
  getOrganizationLimits,
  getRolling30DaysStart,
  getUsageSnapshot,
  getUserSlotUsage,
  isUnlimited,
} from '@/lib/limits'
import { getTenantModels } from '@/lib/db/tenant-models'

type OrgDistributionRow = {
  id: string
  slug: string
  name: string
  description?: string
  logoUrl?: string
  memberCount: number
  used: number
  limit: number
}

function sumLimits(values: number[]): number {
  if (values.some((v) => isUnlimited(v))) return -1
  return values.reduce((sum, v) => sum + v, 0)
}

export async function GET() {
  try {
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    await dbConnect()

    const organizations = await Organization.find({
      status: { $ne: 'deleted' },
    })
      .select('_id slug name description logoUrl status limits')
      .lean()

    const orgIds = organizations.map((o) => o._id)
    const memberCountsAgg = await User.aggregate([
      { $unwind: '$memberships' },
      {
        $match: {
          'memberships.organizationId': { $in: orgIds },
        },
      },
      {
        $group: {
          _id: '$memberships.organizationId',
          count: { $sum: 1 },
        },
      },
    ])

    const memberCounts = new Map<string, number>(
      memberCountsAgg.map((row) => [String(row._id), Number(row.count) || 0])
    )

    const now = new Date()
    const windowStart = getRolling30DaysStart(now)

    const eventsDistribution: OrgDistributionRow[] = []
    const receiptsDistribution: OrgDistributionRow[] = []
    const usersDistribution: OrgDistributionRow[] = []

    let totalEventsUsed = 0
    let totalReceiptsUsed = 0
    let totalUsersUsed = 0

    const maxEventsValues: number[] = []
    const maxReceiptsValues: number[] = []
    const maxUsersValues: number[] = []

    for (const org of organizations) {
      const orgId = org._id.toString()
      const memberCount = memberCounts.get(orgId) ?? 0

      const limits = await getOrganizationLimits(org._id)
      if (!limits) continue

      const models = await getTenantModels(org.slug)

      const [usage, userSlots] = await Promise.all([
        getUsageSnapshot({
          organizationId: org._id,
          models,
          now,
        }),
        getUserSlotUsage(org._id, now),
      ])

      maxEventsValues.push(limits.maxEvents)
      maxReceiptsValues.push(limits.maxReceiptsPerMonth)
      maxUsersValues.push(limits.maxUsers)

      totalEventsUsed += usage.eventsActive
      totalReceiptsUsed += usage.receiptsLast30Days
      totalUsersUsed += userSlots.usersTotal

      eventsDistribution.push({
        id: orgId,
        slug: org.slug,
        name: org.name,
        description: org.description,
        logoUrl: org.logoUrl,
        memberCount,
        used: usage.eventsActive,
        limit: limits.maxEvents,
      })

      receiptsDistribution.push({
        id: orgId,
        slug: org.slug,
        name: org.name,
        description: org.description,
        logoUrl: org.logoUrl,
        memberCount,
        used: usage.receiptsLast30Days,
        limit: limits.maxReceiptsPerMonth,
      })

      usersDistribution.push({
        id: orgId,
        slug: org.slug,
        name: org.name,
        description: org.description,
        logoUrl: org.logoUrl,
        memberCount,
        used: userSlots.usersTotal,
        limit: limits.maxUsers,
      })
    }

    const totals = {
      eventsActive: totalEventsUsed,
      receiptsLast30Days: totalReceiptsUsed,
      usersTotal: totalUsersUsed,
    }

    const limitsTotals = {
      maxEvents: sumLimits(maxEventsValues),
      maxReceiptsPerMonth: sumLimits(maxReceiptsValues),
      maxUsers: sumLimits(maxUsersValues),
    }

    const byUsedDesc = (a: OrgDistributionRow, b: OrgDistributionRow) =>
      b.used - a.used

    return NextResponse.json(
      {
        totals,
        limits: limitsTotals,
        distribution: {
          events: eventsDistribution.sort(byUsedDesc),
          receipts: receiptsDistribution.sort(byUsedDesc),
          users: usersDistribution.sort(byUsedDesc),
        },
        window: {
          kind: 'rolling-30-days',
          start: windowStart.toISOString(),
          end: now.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Superadmin system usages API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system usage' },
      { status: 500 }
    )
  }
}
