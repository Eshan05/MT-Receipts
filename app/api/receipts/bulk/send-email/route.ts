import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Receipt from '@/models/receipt.model'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const { receiptNumbers } = body

    if (!receiptNumbers || !Array.isArray(receiptNumbers)) {
      return NextResponse.json(
        { message: 'Invalid receipt numbers' },
        { status: 400 }
      )
    }

    const receipts = await Receipt.find({
      receiptNumber: { $in: receiptNumbers },
      emailSent: false,
    })

    let sentCount = 0
    let failedCount = 0

    for (const receipt of receipts) {
      try {
        // Here you would integrate with your email service
        // For now, we'll just mark them as sent
        receipt.emailSent = true
        receipt.emailSentAt = new Date()
        receipt.emailLog.push({
          sentTo: receipt.customer.email,
          status: 'sent',
          sentAt: new Date(),
        })
        await receipt.save()
        sentCount++
      } catch {
        failedCount++
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      sentCount,
      failedCount,
    })
  } catch (error) {
    console.error('Error sending bulk emails:', error)
    return NextResponse.json(
      { message: 'Failed to send emails' },
      { status: 500 }
    )
  }
}
