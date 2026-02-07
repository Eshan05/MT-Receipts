import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import ReceiptEmail from '@/lib/emails/receipt-email'
import {
  renderReceiptPDF,
  streamToBuffer,
  type RenderReceiptOptions,
} from '@/lib/pdf/template-renderer'
import type { TemplateConfig } from '@/lib/templates/types'
import dbConnect from '@/lib/db-conn'
import { decryptSmtpAppPassword } from '@/lib/tenants/smtp-vault-crypto'
import { getTenantModels } from '@/lib/db/tenant-models'
import { ensureQrPngIsRgbDataUrl } from '@/lib/qr-code-data'

interface SenderCredentials {
  vaultId?: string
  label?: string
  user: string
  pass: string
}

async function resolveSenderCredentials(opts?: {
  smtpVaultId?: string
  organizationId?: string
  organizationSlug?: string
}): Promise<SenderCredentials> {
  await dbConnect()

  const smtpVaultId = opts?.smtpVaultId
  const organizationId = opts?.organizationId
  const organizationSlug = opts?.organizationSlug

  if (!organizationSlug) {
    // Without a tenant slug, we can't safely look up tenant DB vaults.
    // Fall back to env-based sender only.
    if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
      return {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      }
    }

    throw new Error(
      'No sender configured. Provide organizationSlug to use tenant SMTP vaults, or set GMAIL_EMAIL/GMAIL_APP_PASSWORD.'
    )
  }

  const { SMTPVault } = await getTenantModels(organizationSlug)

  let selectedVault = null

  if (smtpVaultId) {
    selectedVault = await SMTPVault.findOne({
      _id: smtpVaultId,
      ...(organizationId ? { organizationId } : {}),
    })
    if (!selectedVault) {
      throw new Error('SMTP vault not found for this organization.')
    }
  } else {
    selectedVault = await SMTPVault.findOne({
      ...(organizationId ? { organizationId } : {}),
      isDefault: true,
    })
    if (!selectedVault) {
      selectedVault = await SMTPVault.findOne({
        ...(organizationId ? { organizationId } : {}),
      }).sort({ createdAt: 1 })
    }
  }

  if (selectedVault) {
    let decryptedPassword: string
    try {
      decryptedPassword = decryptSmtpAppPassword(
        selectedVault.encryptedAppPassword,
        selectedVault.iv,
        selectedVault.authTag
      )
    } catch (error) {
      const maybeMessage =
        error instanceof Error ? error.message : String(error)
      if (maybeMessage.includes('unable to authenticate data')) {
        throw new Error(
          'Unable to decrypt SMTP vault password. Ensure SMTP_VAULT_SECRET (or JWT_SECRET fallback) matches the value used when this vault entry was created. If the secret changed, you must recreate the SMTP vault entry.'
        )
      }
      throw error
    }

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
  const credentials = await resolveSenderCredentials({ smtpVaultId })

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
  organizationId?: string
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
  templateConfig?: Partial<TemplateConfig>
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
  organizationId,
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
  templateConfig,
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
    const effectivePrimaryColor = templateConfig?.primaryColor || primaryColor
    const effectiveSecondaryColor =
      templateConfig?.secondaryColor || secondaryColor

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
        primaryColor: effectivePrimaryColor,
        secondaryColor: effectiveSecondaryColor,
        emailFromAddress,
      })
    )

    let finalQrCodeData: string | undefined

    try {
      finalQrCodeData =
        typeof qrCodeData === 'string' &&
        qrCodeData.startsWith('data:image/jpeg')
          ? qrCodeData
          : undefined

      if (!finalQrCodeData) {
        const { generateReceiptQRCode } = await import('@/lib/qr-code')
        finalQrCodeData = await generateReceiptQRCode(
          receiptNumber,
          organizationSlug,
          {
            format: 'jpeg',
          }
        )
      }
    } catch {
      finalQrCodeData = await ensureQrPngIsRgbDataUrl(qrCodeData)
      if (!finalQrCodeData) {
        const { generateReceiptQRCode } = await import('@/lib/qr-code')
        finalQrCodeData = await generateReceiptQRCode(
          receiptNumber,
          organizationSlug
        )
        finalQrCodeData = await ensureQrPngIsRgbDataUrl(finalQrCodeData)
      }
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
      customConfig: templateConfig,
    }

    const { stream } = await renderReceiptPDF(renderOptions)
    const pdfBuffer = await streamToBuffer(stream)

    const senderCredentials = await resolveSenderCredentials({
      smtpVaultId,
      organizationId,
      organizationSlug,
    })
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
  organizationId,
  organizationSlug,
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
  organizationId?: string
  organizationSlug?: string
}) {
  try {
    const senderCredentials = await resolveSenderCredentials({
      smtpVaultId,
      organizationId,
      organizationSlug,
    })
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
