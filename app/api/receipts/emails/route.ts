import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { sendReceiptEmail } from '@/lib/email'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import { getOrganizationBrandingBySlug } from '@/lib/tenants/organization-branding'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

type PopulatedEvent = {
  name: string
  eventCode: string
  type: string
  location?: string
  startDate?: Date
  endDate?: Date
}

function isPopulatedEvent(value: unknown): value is PopulatedEvent {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    typeof v.eventCode === 'string' &&
    typeof v.type === 'string'
  )
}

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

    const { Receipt } = ctx.models
    const { searchParams } = new URL(request.url)
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '100', 10)
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 300)
      : 100

    type ReceiptEmailLogResult = {
      receiptNumber: string
      emailLog: {
        sentTo: string
        status: 'sent' | 'failed'
        sentAt: Date
        sentByUserId?: string
        sentByUsername?: string
        smtpSender?: string
        smtpVaultId?: string
        messageId?: string
      }
    }

    const rows = (await Receipt.aggregate([
      { $unwind: '$emailLog' },
      { $match: { 'emailLog.status': 'sent' } },
      { $sort: { 'emailLog.sentAt': -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          receiptNumber: 1,
          emailLog: 1,
        },
      },
    ])) as ReceiptEmailLogResult[]

    const senderIds = Array.from(
      new Set(
        rows
          .map((row) => row.emailLog.sentByUserId)
          .filter((value): value is string => Boolean(value))
      )
    )

    const senderNameMap = new Map<string, string>()
    if (senderIds.length > 0) {
      await dbConnect()
      const users = await User.find({ _id: { $in: senderIds } })
        .select('username')
        .lean()
      for (const user of users) {
        senderNameMap.set(user._id.toString(), user.username)
      }
    }

    return NextResponse.json({
      logs: rows.map((row, index) => {
        const senderId = row.emailLog.sentByUserId
        const senderName =
          row.emailLog.sentByUsername ||
          (senderId ? senderNameMap.get(senderId) : undefined)

        return {
          id: `${row.receiptNumber}-${row.emailLog.sentAt?.toString() || index}`,
          receiptNumber: row.receiptNumber,
          sentTo: row.emailLog.sentTo,
          sentAt: row.emailLog.sentAt,
          sentByUserId: senderId,
          sentByName: senderName || 'Unknown',
          smtpSender: row.emailLog.smtpSender || 'Unknown',
          smtpVaultId: row.emailLog.smtpVaultId,
          messageId: row.emailLog.messageId,
          downloadUrl: `/api/receipts/${row.receiptNumber}?format=pdf`,
        }
      }),
    })
  } catch (error) {
    baseLog.error('receipt_email_activity_fetch_error', { error })
    return NextResponse.json(
      { message: 'Failed to fetch receipt email activity' },
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

    const { Receipt } = ctx.models
    const body = await request.json()
    const { filter, templateSlug, smtpVaultId } = body

    if (
      !filter ||
      !filter.receiptNumbers ||
      !Array.isArray(filter.receiptNumbers)
    ) {
      return NextResponse.json(
        { message: 'Invalid filter. Provide receiptNumbers array.' },
        { status: 400 }
      )
    }

    const { receiptNumbers } = filter

    const receipts = await Receipt.find({
      receiptNumber: { $in: receiptNumbers },
      refunded: { $ne: true },
    }).populate('event')
    const organizationBranding = await getOrganizationBrandingBySlug(
      ctx.organization.slug
    )

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const receipt of receipts) {
      try {
        const emailRl = await checkRateLimit({
          policy: RATE_LIMITS.receiptEmailSend,
          scope: `tenant:${ctx.organization.id}`,
        })
        if (!emailRl.success) {
          failedCount++
          errors.push(
            `${receipt.receiptNumber}: rate limited (${emailRl.policy.name})`
          )
          continue
        }

        const event: unknown = receipt.event
        if (!isPopulatedEvent(event)) {
          throw new Error('Receipt is missing populated event data')
        }

        const result = await sendReceiptEmail({
          to: receipt.customer.email,
          receiptNumber: receipt.receiptNumber,
          organizationSlug: ctx.organization.slug,
          customerName: receipt.customer.name,
          customerPhone: receipt.customer.phone,
          customerAddress: receipt.customer.address,
          eventName: event.name,
          eventCode: event.eventCode,
          eventType: event.type,
          eventLocation: event.location,
          eventStartDate: event.startDate?.toISOString(),
          eventEndDate: event.endDate?.toISOString(),
          items: receipt.items.map((item) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
          totalAmount: receipt.totalAmount,
          paymentMethod: receipt.paymentMethod,
          organizationName:
            organizationBranding?.organizationName || ctx.organization.name,
          organizationLogo: organizationBranding?.logoUrl,
          primaryColor: organizationBranding?.primaryColor,
          secondaryColor: organizationBranding?.secondaryColor,
          emailFromName: organizationBranding?.emailFromName,
          emailFromAddress: organizationBranding?.emailFromAddress,
          notes: receipt.notes,
          qrCodeData: receipt.qrCodeData,
          templateSlug,
          smtpVaultId,
        })

        if (result.success) {
          receipt.emailSent = true
          receipt.emailSentAt = new Date()
          receipt.emailLog.push({
            sentTo: receipt.customer.email,
            status: 'sent',
            sentAt: new Date(),
            sentByUserId: ctx.user.id,
            sentByUsername: ctx.user.username,
            smtpSender: result.senderEmail,
            smtpVaultId: result.smtpVaultId,
            messageId: result.messageId,
          })
          await receipt.save()
          sentCount++
        } else {
          receipt.emailLog.push({
            sentTo: receipt.customer.email,
            status: 'failed',
            sentAt: new Date(),
            error: result.error,
            sentByUserId: ctx.user.id,
            sentByUsername: ctx.user.username,
            smtpSender: result.senderEmail,
            smtpVaultId: result.smtpVaultId,
          })
          await receipt.save()
          failedCount++
          errors.push(`${receipt.receiptNumber}: ${result.error}`)
        }
      } catch (err) {
        failedCount++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${receipt.receiptNumber}: ${errorMsg}`)
      }
    }

    log.info('receipt_bulk_email_complete', {
      attempted: receipts.length,
      sentCount,
      failedCount,
    })

    await writeAuditLog({
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      action: failedCount > 0 ? 'EMAIL_FAILED' : 'EMAIL_SENT',
      resourceType: 'RECEIPT',
      details: {
        kind: 'bulk_email',
        attempted: receipts.length,
        sentCount,
        failedCount,
        errors: errors.slice(0, 25),
        requestId: meta.requestId,
      },
      status: failedCount > 0 ? 'FAILURE' : 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => undefined)

    return NextResponse.json({
      message: `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    baseLog.error('receipt_bulk_email_error', { error })
    return NextResponse.json(
      { message: 'Failed to send emails' },
      { status: 500 }
    )
  }
}
