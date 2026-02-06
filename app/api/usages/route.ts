import { NextResponse } from 'next/server'
import { getTenantContext, requireAdmin } from '@/lib/auth/tenant-route'
import {
  getOrganizationLimits,
  getRolling30DaysStart,
  getUsageSnapshot,
} from '@/lib/tenants/limits'

export async function GET() {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const adminCheck = await requireAdmin(ctx)
    if (adminCheck instanceof NextResponse) return adminCheck

    const limits = await getOrganizationLimits(ctx.organization.id)
    if (!limits) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const windowStart = getRolling30DaysStart(now)

    const usage = await getUsageSnapshot({
      organizationId: ctx.organization.id,
      models: ctx.models,
      now,
    })

    return NextResponse.json(
      {
        organization: {
          id: ctx.organization.id,
          slug: ctx.organization.slug,
          name: ctx.organization.name,
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
    console.error('Usages API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
