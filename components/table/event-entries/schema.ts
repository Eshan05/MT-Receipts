import { z } from 'zod'

export const receiptItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  total: z.number().optional(),
})

export const receiptCustomerSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const emailLogSchema = z.object({
  sentTo: z.string(),
  status: z.enum(['sent', 'failed']),
  sentAt: z.coerce.date(),
  error: z.string().optional(),
})

export const receiptTaxLineSchema = z.object({
  name: z.string(),
  rate: z.number(),
  amount: z.number().optional(),
})

export const eventEntrySchema = z.object({
  _id: z.string(),
  receiptNumber: z.string(),
  customer: receiptCustomerSchema,
  items: z.array(receiptItemSchema),
  taxes: z.array(receiptTaxLineSchema).optional(),
  subtotalAmount: z.number().optional(),
  totalAmount: z.number(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'other']).optional(),
  emailSent: z.boolean(),
  emailSentAt: z.coerce.date().optional(),
  emailError: z.string().optional(),
  emailLog: z.array(emailLogSchema).optional(),
  pdfUrl: z.string().optional(),
  refunded: z.boolean().optional(),
  refundReason: z.string().optional(),
  refundedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
  createdBy: z.string().optional(),
})

export type ReceiptItem = z.infer<typeof receiptItemSchema>
export type ReceiptCustomer = z.infer<typeof receiptCustomerSchema>
export type EmailLog = z.infer<typeof emailLogSchema>
export type EventEntry = z.infer<typeof eventEntrySchema>
