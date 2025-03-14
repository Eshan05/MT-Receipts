import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import ReceiptEmail from '@/lib/emails/receipt-email'
import {
  renderReceiptPDF,
  streamToBuffer,
  type RenderReceiptOptions,
} from '@/lib/pdf/template-renderer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export interface ReceiptItem {
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}

export interface SendReceiptOptions {
  to: string
  receiptNumber: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  eventName: string
  eventCode: string
  eventType: string
  eventTemplateId?: string
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod?: string
  organizationName?: string
}

export async function sendReceiptEmail({
  to,
  receiptNumber,
  customerName,
  customerPhone,
  customerAddress,
  eventName,
  eventCode,
  eventType,
  eventTemplateId,
  items,
  totalAmount,
  paymentMethod,
  organizationName = 'ACES',
}: SendReceiptOptions) {
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  try {
    const emailHtml = await render(
      ReceiptEmail({
        receiptNumber,
        customerName,
        customerEmail: to,
        eventName,
        eventCode,
        items,
        totalAmount,
        paymentMethod,
        date,
        organizationName,
      })
    )

    const renderOptions: RenderReceiptOptions = {
      receiptNumber,
      customer: {
        name: customerName,
        email: to,
        phone: customerPhone,
        address: customerAddress,
      },
      event: {
        _id: '',
        name: eventName,
        code: eventCode,
        type: eventType,
        templateId: eventTemplateId,
      },
      items,
      totalAmount,
      paymentMethod,
      date,
    }

    const { stream } = await renderReceiptPDF(renderOptions)
    const pdfBuffer = await streamToBuffer(stream)

    const info = await transporter.sendMail({
      from: `"${organizationName} Receipts" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject: `Receipt #${receiptNumber} - ${eventName}`,
      html: emailHtml,
      attachments: [
        {
          filename: `receipt-${receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Receipt email sending failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}) {
  try {
    const info = await transporter.sendMail({
      from: `"ACES Receipts" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
      attachments,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email sending failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default transporter
