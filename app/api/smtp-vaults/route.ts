import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { encryptSmtpAppPassword } from '@/lib/tenants/smtp-vault-crypto'
import SMTPVault from '@/models/smtp-vault.model'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

function sanitizeVault(vault: {
  _id: string
  label?: string
  email: string
  isDefault: boolean
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: vault._id,
    label: vault.label,
    email: vault.email,
    isDefault: vault.isDefault,
    lastUsedAt: vault.lastUsedAt,
    createdAt: vault.createdAt,
    updatedAt: vault.updatedAt,
  }
}

export async function GET(request?: Request) {
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

    const vaults = await SMTPVault.find({
      organizationId: ctx.organization.id,
    }).sort({ isDefault: -1, createdAt: -1 })

    return NextResponse.json({
      vaults: vaults.map((vault) =>
        sanitizeVault({
          _id: String(vault._id),
          label: vault.label,
          email: vault.email,
          isDefault: vault.isDefault,
          lastUsedAt: vault.lastUsedAt,
          createdAt: vault.createdAt,
          updatedAt: vault.updatedAt,
        })
      ),
    })
  } catch (error) {
    baseLog.error('smtp_vaults_fetch_error', { error })
    return NextResponse.json(
      { message: 'Failed to fetch SMTP vaults' },
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

    const vaultWriteRl = await checkRateLimit({
      policy: RATE_LIMITS.smtpVaultWrite,
      scope: `tenant:${ctx.organization.id}`,
    })
    if (!vaultWriteRl.success) {
      log.warn('rate_limited', { limiter: vaultWriteRl.policy.name })
      return rateLimitedResponse(vaultWriteRl)
    }

    const body = await request.json()

    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const name = String(body.senderName || '').trim()
    const appPassword = String(body.appPassword || '').trim()
    const requestedDefault = Boolean(body.isDefault)

    if (!email || !appPassword) {
      return NextResponse.json(
        { message: 'Email and app password are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      )
    }

    const existing = await SMTPVault.findOne({
      organizationId: ctx.organization.id,
      email,
    }).lean()
    if (existing) {
      return NextResponse.json(
        { message: 'This email is already in your vault' },
        { status: 409 }
      )
    }

    const vaultCount = await SMTPVault.countDocuments({
      organizationId: ctx.organization.id,
    })
    const isDefault = requestedDefault || vaultCount === 0

    if (isDefault) {
      await SMTPVault.updateMany(
        { organizationId: ctx.organization.id, isDefault: true },
        { isDefault: false }
      )
    }

    const { encryptedData, iv, authTag } = encryptSmtpAppPassword(appPassword)

    const vault = await SMTPVault.create({
      organizationId: ctx.organization.id,
      label: name || undefined,
      email,
      encryptedAppPassword: encryptedData,
      iv,
      authTag,
      isDefault,
      createdBy: ctx.user.id,
    })

    log.info('smtp_vault_created', {
      vaultId: String(vault._id),
      email,
      isDefault,
    })

    await writeAuditLog({
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      action: 'CREATE',
      resourceType: 'ORGANIZATION',
      resourceId: ctx.organization.id,
      details: {
        kind: 'smtp_vault',
        vaultId: String(vault._id),
        email,
        isDefault,
        requestId: meta.requestId,
      },
      status: 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => undefined)

    return NextResponse.json(
      {
        message: 'SMTP vault created successfully',
        vault: sanitizeVault({
          _id: String(vault._id),
          label: vault.label,
          email: vault.email,
          isDefault: vault.isDefault,
          lastUsedAt: vault.lastUsedAt,
          createdAt: vault.createdAt,
          updatedAt: vault.updatedAt,
        }),
      },
      { status: 201 }
    )
  } catch (error) {
    baseLog.error('smtp_vault_create_error', { error })
    return NextResponse.json(
      { message: 'Failed to create SMTP vault' },
      { status: 500 }
    )
  }
}
