import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { receiptEmailJobSchema } from '@/lib/queue/receipt-email'
import { getTenantModels } from '@/lib/db/tenant-models'
import { resolveOrganizationFromCache } from '@/lib/tenants/organization-context'
import { getOrganizationBrandingBySlug } from '@/lib/tenants/organization-branding'
import { sendReceiptEmail } from '@/lib/email'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'
import { createLogger } from '@/lib/logger'
import { getQstashSigningConfig } from '@/lib/queue/qstash'
import dbConnect from '@/lib/db-conn'
import ReceiptEmailBatch from '@/models/receipt-email-batch.model'
import ReceiptEmailJobItem from '@/models/receipt-email-job-item.model'
import { writeSystemLog } from '@/lib/system-logs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

const normalizeHex = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) return withHash
  return undefined
}

export const POST = verifySignatureAppRouter(async (req: NextRequest) => {
  const body = await req.json().catch(() => null)
  const parsed = receiptEmailJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid job payload', errors: parsed.error.issues },
      { status: 400 }
    )
  }

  const job = parsed.data

  const log = createLogger({
    job: 'receipt-email',
    organizationSlug: job.organizationSlug,
    receiptNumber: job.receiptNumber,
    requestId: job.requestId,
  })

  const batchId = job.requestId
  if (batchId) {
    await dbConnect()
    await ReceiptEmailJobItem.updateOne(
      {
        batchId,
        organizationSlug: job.organizationSlug,
        receiptNumber: job.receiptNumber,
      },
      {
        $set: {
          status: 'processing',
          lastError: undefined,
          lastTriedAt: new Date(),
        },
        $inc: { attempts: 1 },
      }
    )
    await ReceiptEmailBatch.updateOne(
      { _id: batchId },
      { $set: { lastActivityAt: new Date() } }
    )
  }

  const org = await resolveOrganizationFromCache(job.organizationSlug)
  if (!org || org.status !== 'active') {
    log.warn('org_not_found_or_inactive', { status: org?.status || null })

    void writeSystemLog({
      level: 'warn',
      kind: 'receipt_email_job_skipped',
      message: 'Skipped receipt email job: org not found or inactive',
      organizationId: job.organizationId,
      organizationSlug: job.organizationSlug,
      batchId: batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
      meta: { orgStatus: org?.status || null },
    }).catch(() => undefined)

    return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
  }

  const emailRl = await checkRateLimit({
    policy: RATE_LIMITS.receiptEmailSend,
    scope: `tenant:${org.id}`,
  })
  if (!emailRl.success) {
    log.warn('rate_limited', { limiter: emailRl.policy.name })

    void writeSystemLog({
      level: 'warn',
      kind: 'receipt_email_job_rate_limited',
      message: 'Receipt email job rate limited; will retry',
      organizationId: org.id,
      organizationSlug: org.slug,
      batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
      meta: { limiter: emailRl.policy.name },
    }).catch(() => undefined)

    if (batchId) {
      await ReceiptEmailJobItem.updateOne(
        {
          batchId,
          organizationSlug: job.organizationSlug,
          receiptNumber: job.receiptNumber,
        },
        {
          $set: {
            status: 'retrying',
            lastError: `rate_limited:${emailRl.policy.name}`,
            lastTriedAt: new Date(),
          },
        }
      )
      await ReceiptEmailBatch.updateOne(
        { _id: batchId },
        { $set: { lastActivityAt: new Date() } }
      )
    }

    return NextResponse.json(
      { message: 'Rate limited', limiter: emailRl.policy.name },
      { status: 429 }
    )
  }

  const models = await getTenantModels(org.slug)
  const receipt = await models.Receipt.findOne({
    receiptNumber: job.receiptNumber,
  }).populate('event')

  if (!receipt) {
    log.warn('receipt_not_found')

    void writeSystemLog({
      level: 'warn',
      kind: 'receipt_email_job_skipped',
      message: 'Skipped receipt email job: receipt not found',
      organizationId: org.id,
      organizationSlug: org.slug,
      batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
    }).catch(() => undefined)

    if (batchId) {
      await ReceiptEmailJobItem.updateOne(
        {
          batchId,
          organizationSlug: job.organizationSlug,
          receiptNumber: job.receiptNumber,
        },
        {
          $set: {
            status: 'skipped',
            lastError: 'receipt_not_found',
            completedAt: new Date(),
          },
        }
      )
      await ReceiptEmailBatch.updateOne(
        { _id: batchId },
        { $set: { lastActivityAt: new Date() } }
      )
    }

    return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
  }

  if (receipt.refunded) {
    log.info('receipt_refunded_skip')

    void writeSystemLog({
      level: 'info',
      kind: 'receipt_email_job_skipped',
      message: 'Skipped receipt email job: receipt refunded',
      organizationId: org.id,
      organizationSlug: org.slug,
      batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
    }).catch(() => undefined)

    if (batchId) {
      await ReceiptEmailJobItem.updateOne(
        {
          batchId,
          organizationSlug: job.organizationSlug,
          receiptNumber: job.receiptNumber,
        },
        {
          $set: {
            status: 'skipped',
            lastError: 'receipt_refunded',
            completedAt: new Date(),
          },
        }
      )
      await ReceiptEmailBatch.updateOne(
        { _id: batchId },
        { $set: { lastActivityAt: new Date() } }
      )
    }

    return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
  }

  const event: unknown = receipt.event
  if (!isPopulatedEvent(event)) {
    log.warn('receipt_event_not_populated')

    void writeSystemLog({
      level: 'warn',
      kind: 'receipt_email_job_skipped',
      message: 'Skipped receipt email job: event not populated',
      organizationId: org.id,
      organizationSlug: org.slug,
      batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
    }).catch(() => undefined)

    if (batchId) {
      await ReceiptEmailJobItem.updateOne(
        {
          batchId,
          organizationSlug: job.organizationSlug,
          receiptNumber: job.receiptNumber,
        },
        {
          $set: {
            status: 'skipped',
            lastError: 'receipt_event_not_populated',
            completedAt: new Date(),
          },
        }
      )
      await ReceiptEmailBatch.updateOne(
        { _id: batchId },
        { $set: { lastActivityAt: new Date() } }
      )
    }

    return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
  }

  const organizationBranding = await getOrganizationBrandingBySlug(org.slug)

  const templateConfig = (() => {
    const primaryColor = normalizeHex(job.templateConfig?.primaryColor)
    const secondaryColor = normalizeHex(job.templateConfig?.secondaryColor)
    const footerText =
      typeof job.templateConfig?.footerText === 'string'
        ? job.templateConfig.footerText.trim() || undefined
        : undefined

    if (!primaryColor && !secondaryColor && !footerText) return undefined
    return {
      ...(primaryColor ? { primaryColor } : {}),
      ...(secondaryColor ? { secondaryColor } : {}),
      ...(footerText ? { footerText } : {}),
    }
  })()

  try {
    const result = await sendReceiptEmail({
      to: receipt.customer.email,
      receiptNumber: receipt.receiptNumber,
      subject: job.subject,
      organizationSlug: org.slug,
      organizationId: org.id,
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
      taxes: receipt.taxes,
      totalAmount: receipt.totalAmount,
      paymentMethod: receipt.paymentMethod,
      organizationName: organizationBranding?.organizationName || org.name,
      organizationLogo: organizationBranding?.logoUrl,
      primaryColor:
        templateConfig?.primaryColor || organizationBranding?.primaryColor,
      secondaryColor:
        templateConfig?.secondaryColor || organizationBranding?.secondaryColor,
      emailFromName: organizationBranding?.emailFromName,
      emailFromAddress: organizationBranding?.emailFromAddress,
      notes: receipt.notes,
      qrCodeData: receipt.qrCodeData,
      templateSlug: job.templateSlug,
      smtpVaultId: job.smtpVaultId,
      templateConfig,
    })

    if (result.success) {
      if (batchId) {
        await ReceiptEmailJobItem.updateOne(
          {
            batchId,
            organizationSlug: job.organizationSlug,
            receiptNumber: job.receiptNumber,
          },
          {
            $set: {
              status: 'succeeded',
              lastError: undefined,
              completedAt: new Date(),
            },
          }
        )
        await ReceiptEmailBatch.updateOne(
          { _id: batchId },
          { $set: { lastActivityAt: new Date() } }
        )
      }

      receipt.emailSent = true
      receipt.emailSentAt = new Date()
      receipt.emailLog.push({
        sentTo: receipt.customer.email,
        status: 'sent',
        sentAt: new Date(),
        sentByUserId: job.actor?.userId,
        sentByUsername: job.actor?.username,
        smtpSender: result.senderEmail,
        smtpVaultId: result.smtpVaultId,
        messageId: result.messageId,
      })
      await receipt.save()

      if (job.actor?.userId) {
        void writeAuditLog({
          userId: job.actor.userId,
          organizationId: org.id,
          organizationSlug: org.slug,
          action: 'EMAIL_SENT',
          resourceType: 'RECEIPT',
          resourceId: receipt._id.toString(),
          details: {
            kind: 'receipt_email_job',
            receiptNumber: receipt.receiptNumber,
            to: receipt.customer.email,
            smtpVaultId: result.smtpVaultId || null,
            senderEmail: result.senderEmail || null,
            messageId: result.messageId || null,
            requestId: job.requestId,
          },
          status: 'SUCCESS',
        }).catch(() => undefined)
      }

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (batchId) {
      await ReceiptEmailJobItem.updateOne(
        {
          batchId,
          organizationSlug: job.organizationSlug,
          receiptNumber: job.receiptNumber,
        },
        {
          $set: {
            status: 'failed',
            lastError: result.error || 'Email send failed',
            completedAt: new Date(),
          },
        }
      )
      await ReceiptEmailBatch.updateOne(
        { _id: batchId },
        { $set: { lastActivityAt: new Date() } }
      )
    }

    receipt.emailLog.push({
      sentTo: receipt.customer.email,
      status: 'failed',
      sentAt: new Date(),
      error: result.error,
      sentByUserId: job.actor?.userId,
      sentByUsername: job.actor?.username,
      smtpSender: result.senderEmail,
      smtpVaultId: result.smtpVaultId,
    })
    await receipt.save()

    void writeSystemLog({
      level: 'error',
      kind: 'receipt_email_job_failed',
      message: 'Receipt email job failed; will retry',
      organizationId: org.id,
      organizationSlug: org.slug,
      batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
      meta: { error: result.error || null },
    }).catch(() => undefined)

    if (job.actor?.userId) {
      void writeAuditLog({
        userId: job.actor.userId,
        organizationId: org.id,
        organizationSlug: org.slug,
        action: 'EMAIL_FAILED',
        resourceType: 'RECEIPT',
        resourceId: receipt._id.toString(),
        details: {
          kind: 'receipt_email_job',
          receiptNumber: receipt.receiptNumber,
          to: receipt.customer.email,
          error: result.error,
          requestId: job.requestId,
        },
        status: 'FAILURE',
      }).catch(() => undefined)
    }

    return NextResponse.json(
      { message: 'Email send failed', error: result.error },
      { status: 500 }
    )
  } catch (error) {
    log.error('receipt_email_job_error', { error })

    void writeSystemLog({
      level: 'error',
      kind: 'receipt_email_job_error',
      message: 'Receipt email job errored; will retry',
      organizationId: job.organizationId,
      organizationSlug: job.organizationSlug,
      batchId,
      receiptNumber: job.receiptNumber,
      requestId: job.requestId,
      meta: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => undefined)

    if (batchId) {
      await ReceiptEmailJobItem.updateOne(
        {
          batchId,
          organizationSlug: job.organizationSlug,
          receiptNumber: job.receiptNumber,
        },
        {
          $set: {
            status: 'failed',
            lastError: error instanceof Error ? error.message : 'Job failed',
            completedAt: new Date(),
          },
        }
      )
      await ReceiptEmailBatch.updateOne(
        { _id: batchId },
        { $set: { lastActivityAt: new Date() } }
      )
    }

    return NextResponse.json(
      { message: 'Job failed' },
      {
        status: 500,
      }
    )
  }
}, getQstashSigningConfig())
