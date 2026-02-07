import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import { writeAuditLog } from '@/lib/tenants/audit-log'

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_AUDIT_LOG_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Audit logging not configured' },
      { status: 503 }
    )
  }

  const provided = request.headers.get('x-internal-audit-log-secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body?.email === 'string' ? body.email : undefined
  const organizationId =
    typeof body?.organizationId === 'string' ? body.organizationId : undefined
  const organizationSlug =
    typeof body?.organizationSlug === 'string'
      ? body.organizationSlug
      : undefined
  const path = typeof body?.path === 'string' ? body.path : undefined

  if (!email || !organizationSlug || !path) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Best-effort: this endpoint is called fire-and-forget from middleware.
  // Keep work minimal and avoid throwing.
  try {
    await dbConnect()

    const user = await User.findOne({ email }).select('_id').lean()
    if (!user?._id) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    await writeAuditLog({
      userId: user._id.toString(),
      organizationId,
      organizationSlug,
      action: 'PAGE_VIEW',
      resourceType: 'ORGANIZATION',
      details: {
        path,
        referrer:
          typeof body?.referrer === 'string' ? body.referrer : undefined,
        userAgent:
          typeof body?.userAgent === 'string' ? body.userAgent : undefined,
      },
      status: 'SUCCESS',
      ipAddress: typeof body?.ip === 'string' ? body.ip : undefined,
      userAgent:
        typeof body?.userAgent === 'string' ? body.userAgent : undefined,
    })
  } catch {
    // swallow
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
