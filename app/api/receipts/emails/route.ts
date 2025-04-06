import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'
import { sendReceiptEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
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

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const receipt of receipts) {
      try {
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
          sentCount++
        } else {
          receipt.emailLog.push({
            sentTo: receipt.customer.email,
            status: 'failed',
            sentAt: new Date(),
            error: result.error,
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

    return NextResponse.json({
      message: `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error sending bulk emails:', error)
    return NextResponse.json(
      { message: 'Failed to send emails' },
      { status: 500 }
    )
  }
}
