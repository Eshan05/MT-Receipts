import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationContext } from '@/lib/tenants/organization-context'
import { getTenantModels } from '@/lib/db/tenant-models'
import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'
import { renderReceiptPDF, streamToBuffer } from '@/lib/pdf/template-renderer'
import { ensureQrPngIsRgbDataUrl } from '@/lib/qr-code-data'

interface RouteParams {
  params: Promise<{ receiptNumber: string }>
}

type ReceiptItem = {
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}

type ReceiptCustomer = {
  name: string
  email: string
  phone?: string
  address?: string
}

type ReceiptLean = {
  _id?: unknown
  receiptNumber: string
  customer: ReceiptCustomer
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod?: string
  notes?: string
  refunded: boolean
  refundReason?: string
  refundedAt?: Date
  emailSent: boolean
  emailSentAt?: Date
  emailError?: string
  emailLog?: unknown
  createdAt: Date
  updatedAt?: Date
  event?: unknown
}

type PopulatedEvent = {
  _id?: { toString(): string }
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

function formatPublicReceipt(
  receipt: ReceiptLean,
  event: PopulatedEvent | null
) {
  return {
    valid: true,
    receipt: {
      receiptNumber: receipt.receiptNumber,
      customer: {
        name: receipt.customer.name,
        email: receipt.customer.email,
        phone: receipt.customer.phone,
        address: receipt.customer.address,
      },
      items: receipt.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totalAmount: receipt.totalAmount,
      paymentMethod: receipt.paymentMethod,
      notes: receipt.notes,
      refunded: receipt.refunded,
      refundReason: receipt.refundReason,
      emailSent: receipt.emailSent,
      createdAt: receipt.createdAt,
    },
    event: event
      ? {
          name: event.name,
          eventCode: event.eventCode,
          type: event.type,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
        }
      : null,
  }
}

function formatPrivateReceipt(
  receipt: ReceiptLean,
  event: PopulatedEvent | null
) {
  return {
    receipt: {
      _id: receipt._id,
      receiptNumber: receipt.receiptNumber,
      customer: receipt.customer,
      items: receipt.items,
      totalAmount: receipt.totalAmount,
      paymentMethod: receipt.paymentMethod,
      notes: receipt.notes,
      refunded: receipt.refunded,
      refundReason: receipt.refundReason,
      refundedAt: receipt.refundedAt,
      emailSent: receipt.emailSent,
      emailSentAt: receipt.emailSentAt,
      emailError: receipt.emailError,
      emailLog: receipt.emailLog,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    },
    event: event
      ? {
          _id: event._id,
          name: event.name,
          eventCode: event.eventCode,
          type: event.type,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
        }
      : null,
  }
}

async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getTokenServer()
    if (!token || token.trim() === '') return false
    const verified = await verifyAuthToken(token)
    return !!verified
  } catch {
    return false
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { receiptNumber } = await params

    const organization = await getOrganizationContext()
    if (!organization) {
      return NextResponse.json(
        { message: 'Organization context not found', valid: false },
        { status: 400 }
      )
    }

    const { Receipt, Event } = await getTenantModels(organization.slug)
    const acceptHeader = request.headers.get('accept') || ''
    const wantsPdf =
      request.nextUrl.searchParams.get('format')?.toLowerCase() === 'pdf'

    if (acceptHeader.includes('application/pdf') || wantsPdf) {
      const receipt = await Receipt.findOne({ receiptNumber }).lean()
      if (!receipt) {
        return NextResponse.json(
          { message: 'Receipt not found' },
          { status: 404 }
        )
      }

      const event = await Event.findById(receipt.event).lean()
      if (!event) {
        return NextResponse.json(
          { message: 'Event not found' },
          { status: 404 }
        )
      }

      let qrCodeData: string | undefined = await ensureQrPngIsRgbDataUrl(
        receipt.qrCodeData
      )
      if (!qrCodeData) {
        const { generateReceiptQRCode } = await import('@/lib/qr-code')
        qrCodeData = await generateReceiptQRCode(
          receiptNumber,
          organization.slug
        )

        qrCodeData = await ensureQrPngIsRgbDataUrl(qrCodeData)
      }

      const result = await renderReceiptPDF({
        receiptNumber: receipt.receiptNumber,
        customer: {
          name: receipt.customer.name,
          email: receipt.customer.email,
          phone: receipt.customer.phone,
          address: receipt.customer.address,
        },
        event: {
          _id: event._id?.toString() || '',
          name: event.name,
          code: event.eventCode || '',
          type: event.type || 'other',
          location: event.location,
          startDate: event.startDate?.toISOString(),
          endDate: event.endDate?.toISOString(),
          templateId: receipt.templateSlug,
        },
        items: receipt.items.map((item) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        totalAmount: receipt.totalAmount,
        paymentMethod: receipt.paymentMethod,
        date: receipt.createdAt?.toISOString(),
        notes: receipt.notes,
        qrCodeData,
      })

      const buffer = await streamToBuffer(result.stream)

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="receipt-${receiptNumber}.pdf"`,
        },
      })
    }

    const isAuth = await isAuthenticated()

    const receipt = await Receipt.findOne({ receiptNumber })
      .populate(
        'event',
        isAuth ? '' : 'name eventCode type location startDate endDate'
      )
      .lean<ReceiptLean>()

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found', valid: false },
        { status: 404 }
      )
    }

    const event = isPopulatedEvent(receipt.event) ? receipt.event : null

    if (isAuth) {
      return NextResponse.json(formatPrivateReceipt(receipt, event))
    }

    return NextResponse.json(formatPublicReceipt(receipt, event))
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json(
      { message: 'Failed to fetch receipt', valid: false },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { receiptNumber } = await params

    const organization = await getOrganizationContext()
    if (!organization) {
      return NextResponse.json(
        { message: 'Organization context not found' },
        { status: 400 }
      )
    }

    const { Receipt } = await getTenantModels(organization.slug)
    const body = await request.json()

    const {
      customer,
      items,
      totalAmount,
      paymentMethod,
      emailSent,
      notes,
      refunded,
      refundReason,
      status,
      createdAt,
      emailSentAt,
    } = body

    const processedItems = items.map(
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

    const updateData: Record<string, unknown> = {
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      items: processedItems,
      totalAmount,
      paymentMethod,
      emailSent,
      notes,
    }

    if (emailSent !== undefined) {
      updateData.emailSent = emailSent
    }

    if (refunded !== undefined) {
      updateData.refunded = refunded
      updateData.refundedAt = refunded ? new Date() : undefined
    }
    if (refundReason !== undefined) {
      updateData.refundReason = refundReason
    }

    if (status === 'refunded') {
      updateData.refunded = true
      updateData.refundedAt = new Date()
    } else if (status === 'sent') {
      updateData.emailSent = true
      updateData.emailSentAt = emailSentAt ? new Date(emailSentAt) : new Date()
    } else if (status === 'failed') {
      updateData.emailSent = false
      updateData.emailError = 'Marked as failed manually'
    } else if (status === 'pending') {
      updateData.emailSent = false
      updateData.emailError = undefined
    }

    if (createdAt) {
      updateData.createdAt = new Date(createdAt)
    }
    if (emailSentAt !== undefined) {
      updateData.emailSentAt = emailSentAt ? new Date(emailSentAt) : undefined
    }

    const receipt = await Receipt.findOneAndUpdate(
      { receiptNumber },
      updateData,
      { new: true }
    )

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Receipt updated successfully',
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        customer: receipt.customer,
        totalAmount: receipt.totalAmount,
      },
    })
  } catch (error) {
    console.error('Error updating receipt:', error)
    return NextResponse.json(
      { message: 'Failed to update receipt' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { receiptNumber } = await params

    const organization = await getOrganizationContext()
    if (!organization) {
      return NextResponse.json(
        { message: 'Organization context not found' },
        { status: 400 }
      )
    }

    const { Receipt } = await getTenantModels(organization.slug)

    const receipt = await Receipt.findOneAndDelete({ receiptNumber })

    if (!receipt) {
      return NextResponse.json(
        { message: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Receipt deleted successfully' })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json(
      { message: 'Failed to delete receipt' },
      { status: 500 }
    )
  }
}
