import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import { sendReceiptEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  try {
    await dbConnect()
    const { receiptNumber } = await params
    const body = await request.json().catch(() => ({}))
    const { templateSlug, smtpVaultId } = body

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

    const event = receipt.event as any

    const result = await sendReceiptEmail({
      to: receipt.customer.email,
      receiptNumber: receipt.receiptNumber,
      customerName: receipt.customer.name,
      customerPhone: receipt.customer.phone,
      customerAddress: receipt.customer.address,
      eventName: event.name,
      eventCode: event.eventCode,
      eventType: event.type,
      eventLocation: event.location,
      eventStartDate: event.startDate?.toISOString(),
      eventEndDate: event.endDate?.toISOString(),
      items: receipt.items.map((item: any) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totalAmount: receipt.totalAmount,
      paymentMethod: receipt.paymentMethod,
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
