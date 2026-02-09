import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { sendReceiptEmail } from '@/lib/email'
import { getOrganizationBrandingBySlug } from '@/lib/tenants/organization-branding'
import { isQstashConfigured } from '@/lib/queue/qstash'
import { enqueueReceiptEmailJob } from '@/lib/queue/receipt-email'
import { getRequestMeta } from '@/lib/request-meta'
import { writeAuditLog } from '@/lib/tenants/audit-log'
import {
  createReceiptEmailBatch,
  createReceiptEmailBatchItems,
  markReceiptEmailBatchEnqueued,
  markReceiptEmailBatchEnqueueFailed,
} from '@/lib/jobs/receipt-email-batches'
import { writeSystemLog } from '@/lib/system-logs'

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

interface RouteParams {
  params: Promise<{ receiptNumber: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { receiptNumber } = await params

    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Receipt } = ctx.models
    const body = await request.json().catch(() => ({}))
    const { templateSlug, smtpVaultId, subject, config } = body
    const organizationBranding = await getOrganizationBrandingBySlug(
      ctx.organization.slug
    )

    const normalizeHex = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined
      const trimmed = value.trim()
      if (!trimmed) return undefined
      const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
      if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash
      if (/^#[0-9a-fA-F]{3}$/.test(withHash)) return withHash
      return undefined
    }

    const templateConfig = (() => {
      const primaryColor = normalizeHex((config as any)?.primaryColor)
      const secondaryColor = normalizeHex((config as any)?.secondaryColor)
      const footerText =
        typeof (config as any)?.footerText === 'string'
          ? ((config as any)?.footerText as string).trim() || undefined
          : undefined

      if (!primaryColor && !secondaryColor && !footerText) return undefined
      return {
        ...(primaryColor ? { primaryColor } : {}),
        ...(secondaryColor ? { secondaryColor } : {}),
        ...(footerText ? { footerText } : {}),
      }
    })()

    const receipt = await Receipt.findOne({ receiptNumber }).populate('event')

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    if (receipt.refunded) {
      return NextResponse.json(
        { message: 'Cannot send email for refunded receipt' },
        { status: 400 }
      )
    }

    const event: unknown = receipt.event
    if (!isPopulatedEvent(event)) {
      return NextResponse.json(
        { message: 'Receipt event not found' },
        { status: 404 }
      )
    }

    const meta = getRequestMeta(request)

    if (isQstashConfigured()) {
      const { batchId } = await createReceiptEmailBatch({
        organizationId: ctx.organization.id,
        organizationSlug: ctx.organization.slug,
        createdByUserId: ctx.user.id,
        total: 1,
        subject,
        templateSlug,
        smtpVaultId,
      })

      await createReceiptEmailBatchItems({
        batchId,
        organizationId: ctx.organization.id,
        organizationSlug: ctx.organization.slug,
        receiptNumbers: [receipt.receiptNumber],
      })

      const queued = await enqueueReceiptEmailJob({
        organizationSlug: ctx.organization.slug,
        organizationId: ctx.organization.id,
        receiptNumber: receipt.receiptNumber,
        actor: { userId: ctx.user.id, username: ctx.user.username },
        subject,
        templateSlug,
        smtpVaultId,
        templateConfig,
        requestId: batchId,
      }).catch((err) => ({
        queued: false,
        messageId: undefined,
        error: err instanceof Error ? err.message : 'Failed to enqueue email',
      }))

      if (!queued.queued) {
        await markReceiptEmailBatchEnqueueFailed({
          batchId,
          error: queued.error || 'Failed to enqueue email',
        })

        void writeSystemLog({
          level: 'error',
          kind: 'receipt_email_batch_enqueue_failed',
          message: 'Failed to enqueue single receipt email',
          organizationId: ctx.organization.id,
          organizationSlug: ctx.organization.slug,
          batchId,
          receiptNumber: receipt.receiptNumber,
          requestId: meta.requestId,
          meta: { error: queued.error },
        }).catch(() => undefined)

        return NextResponse.json(
          {
            message: 'Failed to queue email',
            error: queued.error,
          },
          { status: 500 }
        )
      }

      await markReceiptEmailBatchEnqueued({ batchId })

      void writeSystemLog({
        level: 'info',
        kind: 'receipt_email_batch_enqueued',
        message: 'Queued single receipt email',
        organizationId: ctx.organization.id,
        organizationSlug: ctx.organization.slug,
        batchId,
        receiptNumber: receipt.receiptNumber,
        requestId: meta.requestId,
      }).catch(() => undefined)

      void writeAuditLog({
        userId: ctx.user.id,
        organizationId: ctx.organization.id,
        organizationSlug: ctx.organization.slug,
        action: 'UPDATE',
        resourceType: 'RECEIPT',
        resourceId: receipt._id.toString(),
        details: {
          kind: 'receipt_email_queued',
          receiptNumber: receipt.receiptNumber,
          to: receipt.customer.email,
          messageId: queued.messageId,
          requestId: meta.requestId,
          jobBatchId: batchId,
        },
        status: 'SUCCESS',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      }).catch(() => undefined)

      return NextResponse.json(
        {
          message: 'Email queued',
          messageId: queued.messageId,
          jobBatchId: batchId,
        },
        { status: 202 }
      )
    }

    const result = await sendReceiptEmail({
      to: receipt.customer.email,
      receiptNumber: receipt.receiptNumber,
      subject,
      organizationSlug: ctx.organization.slug,
      organizationId: ctx.organization.id,
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
      organizationName:
        organizationBranding?.organizationName || ctx.organization.name,
      organizationLogo: organizationBranding?.logoUrl,
      primaryColor:
        templateConfig?.primaryColor || organizationBranding?.primaryColor,
      secondaryColor:
        templateConfig?.secondaryColor || organizationBranding?.secondaryColor,
      emailFromName: organizationBranding?.emailFromName,
      emailFromAddress: organizationBranding?.emailFromAddress,
      notes: receipt.notes,
      qrCodeData: receipt.qrCodeData,
      templateSlug,
      smtpVaultId,
      templateConfig,
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

      return NextResponse.json({
        message: 'Email sent successfully',
        messageId: result.messageId,
      })
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

      return NextResponse.json(
        { message: 'Failed to send email', error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending receipt email:', error)
    return NextResponse.json(
      { message: 'Failed to send email' },
      { status: 500 }
    )
  }
}
