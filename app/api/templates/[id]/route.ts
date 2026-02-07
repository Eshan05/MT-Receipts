import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const meta = getRequestMeta(req)
  const baseLog = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const ctx = await getTenantContext(req)
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
    const { id } = await params

    const template = await Template.findById(id)
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template }, { status: 200 })
  } catch (error) {
    baseLog.error('template_fetch_error', { error })
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const meta = getRequestMeta(req)
  const baseLog = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const ctx = await getTenantContext(req)
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
    const { id } = await params
    const body = await req.json()

    const { name, description, config, isDefault, htmlTemplate, category } =
      body

    const template = await Template.findById(id)
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    if (name && name !== template.name) {
      const existingTemplate = await Template.findOne({
        name,
        _id: { $ne: id },
      })
      if (existingTemplate) {
        return NextResponse.json(
          { message: 'Template with this name already exists' },
          { status: 400 }
        )
      }
      template.name = name
    }

    if (description !== undefined) template.description = description
    if (config) template.config = config
    if (htmlTemplate !== undefined) template.htmlTemplate = htmlTemplate
    if (category !== undefined) template.category = category

    if (isDefault === true && !template.isDefault) {
      await Template.updateMany({}, { isDefault: false })
      template.isDefault = true
    } else if (isDefault === false) {
      template.isDefault = false
    }

    await template.save()

    void writeAuditLog({
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      action: 'UPDATE',
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

    return NextResponse.json({ template }, { status: 200 })
  } catch (error) {
    baseLog.error('template_update_error', { error })
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const meta = getRequestMeta(req)
  const baseLog = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const ctx = await getTenantContext(req)
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
    const { id } = await params

    const template = await Template.findByIdAndDelete(id)
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    void writeAuditLog({
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      action: 'DELETE',
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

    return NextResponse.json({ message: 'Template deleted' }, { status: 200 })
  } catch (error) {
    baseLog.error('template_delete_error', { error })
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
