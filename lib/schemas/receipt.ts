import { z } from 'zod'

export const templateConfigSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  showQrCode: z.boolean(),
  footerText: z.string().optional(),
  organizationName: z.string().optional(),
})

export const receiptCustomerSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const receiptItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  total: z.number(),
})

export const receiptTaxSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0),
})

export const receiptSchema = z.object({
  eventId: z.string(),
  templateSlug: z.string(),
  customer: receiptCustomerSchema,
  items: z.array(receiptItemSchema),
  taxes: z.array(receiptTaxSchema).optional(),
  totalAmount: z.number(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  config: templateConfigSchema,
})

export type TemplateConfigFormValues = z.infer<typeof templateConfigSchema>
export type ReceiptFormValues = z.infer<typeof receiptSchema>
