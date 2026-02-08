import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { generateCustomerInitials } from '@/lib/utils'
import { sendReceiptEmail } from '@/lib/email'
import { getOrganizationBrandingBySlug } from '@/lib/tenants/organization-branding'
import { formatReceiptNumber } from '@/lib/tenants/receipt-number'
import { enforceMaxReceipts } from '@/lib/tenants/quota-enforcement'
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

    const { Receipt, Event } = ctx.models
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const filter: Record<string, unknown> = {}

    if (eventId) {
      filter.event = eventId
    }

    if (cursor) {
      const cursorReceipt = await Receipt.findById(cursor)
        .select('createdAt')
        .lean()
      if (cursorReceipt) {
        filter.createdAt = { $lt: cursorReceipt.createdAt }
      }
    }

    const receipts = await Receipt.find(filter)
      .populate('event', 'name eventCode type')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean()

    const hasMore = receipts.length > limit
    const paginatedReceipts = hasMore ? receipts.slice(0, limit) : receipts
    const nextCursor = hasMore
      ? paginatedReceipts[paginatedReceipts.length - 1]?._id?.toString()
      : null

    return NextResponse.json({
      receipts: paginatedReceipts,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    baseLog.error('receipts_fetch_error', { error })
    return NextResponse.json(
      { message: 'Failed to fetch receipts' },
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

    const createRl = await checkRateLimit({
      policy: RATE_LIMITS.receiptCreate,
      scope: `tenant:${ctx.organization.id}`,
    })
    if (!createRl.success) {
      log.warn('rate_limited', { limiter: createRl.policy.name })
      return rateLimitedResponse(createRl)
    }

    const { Receipt, Event, Sequence } = ctx.models
    const body = await request.json()
    const {
      eventId,
      templateSlug,
      customer,
      items,
      taxes,
      totalAmount,
      paymentMethod,
      emailSent,
      sendEmail,
      notes,
      smtpVaultId,
    } = body

    if (!eventId || !customer || !items) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const event = await Event.findById(eventId)
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    const quotaCheck = await enforceMaxReceipts(ctx)
    if (quotaCheck) return quotaCheck

    const initials = generateCustomerInitials(customer.name)
    const organizationBranding = await getOrganizationBrandingBySlug(
      ctx.organization.slug
    )
    const sequenceName = `receipt_${event.eventCode}`
    const sequence = await Sequence.findOneAndUpdate(
      { name: sequenceName },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    )
    const sequenceNumber = sequence.value.toString().padStart(5, '0')
    const receiptNumber = formatReceiptNumber(
      organizationBranding?.receiptNumberFormat,
      {
        eventCode: event.eventCode,
        initials,
        sequenceNumber,
        organizationName: organizationBranding?.organizationName,
        organizationSlug: ctx.organization.slug,
        eventType: event.type,
      }
    )

    type ProcessedItem = {
      name: string
      description?: string
      quantity: number
      price: number
      total: number
    }

    const processedItems: ProcessedItem[] = (
      Array.isArray(items) ? items : []
    ).map(
      (item: {
        name: string
        description?: string
        quantity: number
        price: number
        total?: number
      }) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total || item.quantity * item.price,
      })
    )

    const subtotal = processedItems.reduce(
      (sum: number, item) => sum + item.total,
      0
    )

    type ProcessedTax = { name: string; rate: number; amount: number }

    const processedTaxes: ProcessedTax[] | undefined = Array.isArray(taxes)
      ? taxes
          .filter((t: any) => t && typeof t.name === 'string')
          .map((t: any): ProcessedTax => {
            const rate = Number(t.rate) || 0
            const amount = Number.isFinite(rate) ? (subtotal * rate) / 100 : 0
            return { name: String(t.name), rate, amount }
          })
      : undefined

    const computedTotalAmount =
      subtotal +
      (processedTaxes?.reduce((sum: number, tax) => sum + tax.amount, 0) || 0)

    const shouldSendEmail = sendEmail && !emailSent

    const receipt = await Receipt.create({
      receiptNumber,
      event: eventId,
      templateSlug: typeof templateSlug === 'string' ? templateSlug : undefined,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      items: processedItems,
      taxes: processedTaxes,
      subtotalAmount: subtotal,
      totalAmount: Number.isFinite(computedTotalAmount)
        ? computedTotalAmount
        : totalAmount,
      paymentMethod,
      emailSent: emailSent || false,
      emailSentAt: emailSent ? new Date() : undefined,
      notes,
      createdBy: ctx.user.id,
    })

    if (shouldSendEmail) {
      const emailRl = await checkRateLimit({
        policy: RATE_LIMITS.receiptEmailSend,
        scope: `tenant:${ctx.organization.id}`,
      })
      if (!emailRl.success) {
        log.warn('rate_limited', { limiter: emailRl.policy.name })
        receipt.emailLog.push({
          sentTo: receipt.customer.email,
          status: 'failed',
          sentAt: new Date(),
          error: 'rate_limited',
          sentByUserId: ctx.user.id,
          sentByUsername: ctx.user.username,
          smtpVaultId,
        })

        await receipt.save()

        await writeAuditLog({
          userId: ctx.user.id,
          organizationId: ctx.organization.id,
          organizationSlug: ctx.organization.slug,
          action: 'EMAIL_FAILED',
          resourceType: 'RECEIPT',
          resourceId: receipt._id.toString(),
          details: {
            receiptNumber: receipt.receiptNumber,
            to: receipt.customer.email,
            smtpVaultId: smtpVaultId || null,
            error: 'rate_limited',
            requestId: meta.requestId,
          },
          status: 'FAILURE',
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        }).catch(() => undefined)

        // Continue returning 201 for the receipt creation.
      } else {
        try {
          const result = await sendReceiptEmail({
            to: receipt.customer.email,
            receiptNumber: receipt.receiptNumber,
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
            primaryColor: organizationBranding?.primaryColor,
            secondaryColor: organizationBranding?.secondaryColor,
            emailFromName: organizationBranding?.emailFromName,
            emailFromAddress: organizationBranding?.emailFromAddress,
            notes: receipt.notes,
            qrCodeData: receipt.qrCodeData,
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
          }

          await receipt.save()

          log.info('receipt_email_attempted', {
            receiptNumber: receipt.receiptNumber,
            success: result.success,
            smtpVaultId: result.smtpVaultId || null,
            senderEmail: result.senderEmail || null,
          })

          await writeAuditLog({
            userId: ctx.user.id,
            organizationId: ctx.organization.id,
            organizationSlug: ctx.organization.slug,
            action: result.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
            resourceType: 'RECEIPT',
            resourceId: receipt._id.toString(),
            details: {
              receiptNumber: receipt.receiptNumber,
              to: receipt.customer.email,
              smtpVaultId: result.smtpVaultId || null,
              senderEmail: result.senderEmail || null,
              messageId: result.messageId || null,
              requestId: meta.requestId,
            },
            status: result.success ? 'SUCCESS' : 'FAILURE',
            ipAddress: meta.ip,
            userAgent: meta.userAgent,
          }).catch(() => undefined)
        } catch (emailError) {
          log.error('receipt_email_error', { error: emailError })
        }
      }
    }

    log.info('receipt_created', {
      receiptId: receipt._id.toString(),
      receiptNumber: receipt.receiptNumber,
      eventId,
      sendEmail: !!shouldSendEmail,
    })

    await writeAuditLog({
      userId: ctx.user.id,
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      action: 'CREATE',
      resourceType: 'RECEIPT',
      resourceId: receipt._id.toString(),
      details: {
        receiptNumber: receipt.receiptNumber,
        eventId,
        totalAmount,
        requestId: meta.requestId,
      },
      status: 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => undefined)

    return NextResponse.json(
      {
        message: 'Receipt created successfully',
        receipt: {
          _id: receipt._id,
          receiptNumber: receipt.receiptNumber,
          customer: receipt.customer,
          totalAmount: receipt.totalAmount,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    baseLog.error('receipt_create_error', { error })
    return NextResponse.json(
      { message: 'Failed to create receipt' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const { filter, ...updates } = body

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
    const updateData: Record<string, unknown> = {}

    if (updates.paymentMethod !== undefined) {
      if (!['cash', 'upi', 'card', 'other'].includes(updates.paymentMethod)) {
        return NextResponse.json(
          { message: 'Invalid payment method' },
          { status: 400 }
        )
      }
      updateData.paymentMethod = updates.paymentMethod
    }

    if (updates.refunded === true) {
      updateData.refunded = true
      updateData.refundedAt = new Date()
    }

    if (updates.refunded === false) {
      updateData.refunded = false
      updateData.refundedAt = undefined
      updateData.refundReason = undefined
    }

    if (updates.refundReason !== undefined) {
      updateData.refundReason = updates.refundReason
    }

    if (updates.emailSent === true) {
      updateData.emailSent = true
      updateData.emailSentAt = new Date()
    }

    if (updates.emailSent === false) {
      updateData.emailSent = false
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const result = await Receipt.updateMany(
      { receiptNumber: { $in: receiptNumbers } },
      updateData
    )

    return NextResponse.json({
      message: `Updated ${result.modifiedCount} receipts`,
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    baseLog.error('receipts_patch_error', { error })
    return NextResponse.json(
      { message: 'Failed to update receipts' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const { receiptNumbers } = body

    if (!receiptNumbers || !Array.isArray(receiptNumbers)) {
      return NextResponse.json(
        { message: 'Invalid receipt numbers' },
        { status: 400 }
      )
    }

    const result = await Receipt.deleteMany({
      receiptNumber: { $in: receiptNumbers },
    })

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} receipts`,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    baseLog.error('receipts_delete_error', { error })
    return NextResponse.json(
      { message: 'Failed to delete receipts' },
      { status: 500 }
    )
  }
}
