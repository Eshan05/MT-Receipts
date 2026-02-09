import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import dbConnect from '@/lib/db-conn'
import SystemLog from '@/models/system-log.model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ctx = await getSuperAdminContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(request.url)

  const parsedLimit = Number.parseInt(searchParams.get('limit') || '200', 10)
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 500)
    : 200

  const level = searchParams.get('level') || undefined
  const kind = searchParams.get('kind') || undefined
  const organizationSlug = searchParams.get('organizationSlug') || undefined
  const batchId = searchParams.get('batchId') || undefined
  const requestId = searchParams.get('requestId') || undefined

  const query: Record<string, unknown> = {}
  if (level) query.level = level
  if (kind) query.kind = kind
  if (organizationSlug) query.organizationSlug = organizationSlug
  if (batchId) query.batchId = batchId
  if (requestId) query.requestId = requestId

  await dbConnect()

  const logs = await SystemLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l._id.toString(),
      level: l.level,
      kind: l.kind,
      message: l.message,
      organizationId: l.organizationId,
      organizationSlug: l.organizationSlug,
      batchId: l.batchId,
      receiptNumber: l.receiptNumber,
      requestId: l.requestId,
      meta: l.meta,
      createdAt: l.createdAt,
    })),
  })
}
