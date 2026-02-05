import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import ReceiptEmail from '@/lib/emails/receipt-email'
import {
  renderReceiptPDF,
  streamToBuffer,
  type RenderReceiptOptions,
} from '@/lib/pdf/template-renderer'
import { generateReceiptQRCode } from '@/lib/qr-code'
import dbConnect from '@/lib/db-conn'
import SMTPVault from '@/models/smtp-vault.model'
import { decryptSmtpAppPassword } from '@/lib/smtp-vault-crypto'

interface SenderCredentials {
  vaultId?: string
  label?: string
  user: string
  pass: string
}

async function resolveSenderCredentials(
  smtpVaultId?: string
): Promise<SenderCredentials> {
  await dbConnect()

  let selectedVault = null

  if (smtpVaultId) {
    selectedVault = await SMTPVault.findById(smtpVaultId)
  } else {
    selectedVault = await SMTPVault.findOne({ isDefault: true })
    if (!selectedVault) {
      selectedVault = await SMTPVault.findOne().sort({ createdAt: 1 })
    }
  }

  if (selectedVault) {
    const decryptedPassword = decryptSmtpAppPassword(
      selectedVault.encryptedAppPassword,
      selectedVault.iv,
      selectedVault.authTag
    )

    await SMTPVault.findByIdAndUpdate(selectedVault._id, {
      lastUsedAt: new Date(),
    })

    return {
      vaultId: String(selectedVault._id),
      label: selectedVault.label,
      user: selectedVault.email,
      pass: decryptedPassword,
    }
  }

  if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
    return {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    }
  }

  throw new Error(
    'No sender configured. Add an SMTP vault sender or set GMAIL_EMAIL/GMAIL_APP_PASSWORD.'
  )
}

async function createTransporter(smtpVaultId?: string) {
  const credentials = await resolveSenderCredentials(smtpVaultId)

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: credentials.user,
      pass: credentials.pass,
    },
  })
}

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
  organizationSlug?: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  eventName: string
  eventCode: string
  eventType: string
  eventTemplateId?: string
  eventLocation?: string
  eventStartDate?: string
  eventEndDate?: string
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod?: string
  organizationName?: string
  organizationLogo?: string
  primaryColor?: string
  secondaryColor?: string
  emailFromName?: string
  emailFromAddress?: string
  notes?: string
  qrCodeData?: string
  templateSlug?: string
  smtpVaultId?: string
}

export async function sendReceiptEmail({
  to,
  receiptNumber,
  organizationSlug,
  customerName,
  customerPhone,
  customerAddress,
  eventName,
  eventCode,
  eventType,
  eventTemplateId,
  eventLocation,
  eventStartDate,
  eventEndDate,
  items,
  totalAmount,
  paymentMethod,
  organizationName = 'ACES',
  organizationLogo,
  primaryColor,
  secondaryColor,
  emailFromName,
  emailFromAddress,
  notes,
  qrCodeData,
  templateSlug,
  smtpVaultId,
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
        organizationLogo,
        primaryColor,
        secondaryColor,
        emailFromAddress,
      })
    )

    let finalQrCodeData = qrCodeData
    if (!finalQrCodeData) {
      finalQrCodeData = await generateReceiptQRCode(
        receiptNumber,
        organizationSlug
      )
    }

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
        templateId: templateSlug || eventTemplateId,
        location: eventLocation,
        startDate: eventStartDate,
        endDate: eventEndDate,
      },
      items,
      totalAmount,
      paymentMethod,
      date,
      notes,
      qrCodeData: finalQrCodeData,
    }

    const { stream } = await renderReceiptPDF(renderOptions)
    const pdfBuffer = await streamToBuffer(stream)

    const senderCredentials = await resolveSenderCredentials(smtpVaultId)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderCredentials.user,
        pass: senderCredentials.pass,
      },
    })

    const fromName =
      emailFromName || senderCredentials.label || `${organizationName} Receipts`
    const fromAddress = emailFromAddress || senderCredentials.user

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
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

    return {
      success: true,
      messageId: info.messageId,
      senderEmail: senderCredentials.user,
      senderLabel: senderCredentials.label,
      smtpVaultId: senderCredentials.vaultId,
    }
  } catch (error) {
    console.error('Receipt email sending failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      senderEmail: undefined,
      senderLabel: undefined,
      smtpVaultId: undefined,
    }
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  smtpVaultId,
}: {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  smtpVaultId?: string
}) {
  try {
    const senderCredentials = await resolveSenderCredentials(smtpVaultId)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderCredentials.user,
        pass: senderCredentials.pass,
      },
    })

    const info = await transporter.sendMail({
      from: `"${senderCredentials.label || 'ACES Receipts'}" <${senderCredentials.user}>`,
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

export default createTransporter
