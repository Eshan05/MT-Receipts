import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { invalidateCachedOrganization } from '@/lib/redis'
import { getTenantDbName } from '@/lib/db/tenant'

function getRetentionDays(): number {
  const raw = process.env.ORGANIZATION_RETENTION_DAYS
  const parsed = raw ? Number.parseInt(raw, 10) : 30
  if (!Number.isFinite(parsed) || parsed <= 0) return 30
  return parsed
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 500 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()

  const now = new Date()
  const retentionDays = getRetentionDays()

  const candidates = await Organization.find({
    status: 'deleted',
    restoresBefore: { $lt: now },
  })
    .select('_id slug restoresBefore')
    .lean<
      { _id: mongoose.Types.ObjectId; slug: string; restoresBefore?: Date }[]
    >()

  const purged: string[] = []
  const errors: Array<{ slug: string; error: string }> = []

  for (const org of candidates) {
    try {
      await User.updateMany(
        { 'memberships.organizationId': org._id },
        {
          $pull: { memberships: { organizationId: org._id } },
          $unset: { currentOrganizationSlug: '' },
        }
      )

      // Drop the tenant database if it exists.
      const tenantDbName = getTenantDbName(org.slug)
      try {
        await mongoose.connection.useDb(tenantDbName).dropDatabase()
      } catch {
        // Ignore drop errors (e.g. DB already gone)
      }

      await Organization.deleteOne({ _id: org._id })
      await invalidateCachedOrganization(org.slug)
      purged.push(org.slug)
    } catch (err) {
      errors.push({
        slug: org.slug,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    message: 'Purge completed',
    retentionDays,
    scanned: candidates.length,
    purgedCount: purged.length,
    purged,
    errors: errors.length ? errors : undefined,
  })
}

export async function GET(request: NextRequest) {
  // allow health-check style invocation
  return POST(request)
}
