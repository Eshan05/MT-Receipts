import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import {
  getOrganizationLimits,
  getRolling30DaysStart,
  getUsageSnapshot,
} from '@/lib/tenants/limits'
import { getTenantModels } from '@/lib/db/tenant-models'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const superAdmin = await getSuperAdminContext()
    if (superAdmin instanceof NextResponse) return superAdmin

    const { slug } = await params

    await dbConnect()

    const organization = await Organization.findBySlug(slug)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const windowStart = getRolling30DaysStart(now)

    const models = await getTenantModels(organization.slug)

    const [limits, usage] = await Promise.all([
      getOrganizationLimits(organization._id),
      getUsageSnapshot({
        organizationId: organization._id,
        models,
        now,
      }),
    ])

    if (!limits) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        organization: {
          id: organization._id.toString(),
          slug: organization.slug,
          name: organization.name,
        },
        limits,
        usage,
        window: {
          kind: 'rolling-30-days',
          start: windowStart.toISOString(),
          end: now.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Superadmin org usages API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
