import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-route'
import { sendReceiptEmail } from '@/lib/email'
import { getOrganizationBrandingBySlug } from '@/lib/organization-branding'

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
    const { templateSlug, smtpVaultId } = body
    const organizationBranding = await getOrganizationBrandingBySlug(
      ctx.organization.slug
    )

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
