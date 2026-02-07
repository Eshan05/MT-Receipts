import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

export async function GET(request: NextRequest) {
  const meta = getRequestMeta(request)
  const baseLog = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const ctx = await getTenantContext(request)
    if (ctx instanceof NextResponse) return ctx

    const log = baseLog.child({
      tenantId: ctx.organization.id,
      tenantSlug: ctx.organization.slug,
      userId: ctx.user.id,
    })

    const tenantApiRl = await checkRateLimit({
      policy: RATE_LIMITS.tenantApiRequests,
      scope: `tenant:${ctx.organization.id}`,
    })
    if (!tenantApiRl.success) {
      log.warn('rate_limited', { limiter: tenantApiRl.policy.name })
      return rateLimitedResponse(tenantApiRl)
    }

    const { Template } = ctx.models
    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('includeAll') === 'true'

    const filter = includeAll ? {} : { isActive: { $ne: false } }

    const templates = await Template.find(filter)
      .sort({ isDefault: -1, name: 1 })
      .lean()

    return NextResponse.json({ templates }, { status: 200 })
  } catch (error) {
    baseLog.error('templates_fetch_error', { error })
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request)
  const baseLog = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const ctx = await getTenantContext(request)
    if (ctx instanceof NextResponse) return ctx

    const log = baseLog.child({
      tenantId: ctx.organization.id,
      tenantSlug: ctx.organization.slug,
      userId: ctx.user.id,
    })

    const tenantApiRl = await checkRateLimit({
      policy: RATE_LIMITS.tenantApiRequests,
      scope: `tenant:${ctx.organization.id}`,
    })
    if (!tenantApiRl.success) {
      log.warn('rate_limited', { limiter: tenantApiRl.policy.name })
      return rateLimitedResponse(tenantApiRl)
    }

    const { Template } = ctx.models
    const body = await request.json()
    const {
      name,
      slug,
      description,
      config,
      isDefault,
      htmlTemplate,
      category,
    } = body

    if (!name || !slug) {
      return NextResponse.json(
        { message: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const existingTemplate = await Template.findOne({ slug })
    if (existingTemplate) {
      return NextResponse.json(
        { message: 'Template with this slug already exists' },
        { status: 400 }
      )
    }

    if (isDefault) {
      await Template.updateMany({}, { isDefault: false })
    }

    const template = await Template.create({
      name,
      slug,
      description,
      config: config || {
        primaryColor: '#1E40AF',
        showQrCode: true,
        organizationName: ctx.organization.name,
      },
      isDefault: isDefault || false,
      htmlTemplate,
      category,
      createdBy: ctx.user.id,
    })

    void writeAuditLog({
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      action: 'CREATE',
      resourceType: 'TEMPLATE',
      resourceId: template._id.toString(),
      details: {
        templateName: template.name,
        templateSlug: template.slug,
        category: template.category,
      },
      status: 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => {})

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    baseLog.error('template_create_error', { error })
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
