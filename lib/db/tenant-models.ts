import mongoose, { Schema, Model } from 'mongoose'
import { getTenantConnection } from './tenant'
import type { Connection } from 'mongoose'

export interface ITenantEvent {
  _id: mongoose.Types.ObjectId
  eventCode: string
  type:
    | 'seminar'
    | 'workshop'
    | 'conference'
    | 'competition'
    | 'meetup'
    | 'training'
    | 'webinar'
    | 'hackathon'
    | 'concert'
    | 'fundraiser'
    | 'networking'
    | 'internal'
    | 'other'
  name: string
  desc?: string
  items: Array<{
    name: string
    description: string
    price: number
  }>
  templateId?: mongoose.Types.ObjectId
  startDate?: Date
  endDate?: Date
  location?: string
  maxPurchases?: number
  tags?: string[]
  createdBy?: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ITenantReceipt {
  _id: mongoose.Types.ObjectId
  receiptNumber: string
  event: mongoose.Types.ObjectId
  customer: {
    name: string
    email: string
    address?: string
    phone?: string
  }
  items: Array<{
    name: string
    description?: string
    quantity: number
    price: number
    total: number
  }>
  taxes?: Array<{
    name: string
    rate: number
    amount: number
  }>
  subtotalAmount?: number
  totalAmount: number
  paymentMethod?: 'cash' | 'upi' | 'card' | 'other'
  templateSlug?: string
  qrCodeData?: string
  pdfUrl?: string
  notes?: string
  emailSent: boolean
  emailSentAt?: Date
  emailError?: string
  emailLog: Array<{
    sentTo: string
    status: 'sent' | 'failed'
    sentAt: Date
    error?: string
    sentByUserId?: string
    sentByUsername?: string
    smtpSender?: string
    smtpVaultId?: string
    messageId?: string
  }>
  refunded: boolean
  refundReason?: string
  refundedAt?: Date
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface ITenantTemplate {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  isDefault: boolean
  config: {
    primaryColor: string
    secondaryColor?: string
    logoUrl?: string
    showQrCode: boolean
    footerText?: string
    organizationName?: string
  }
  htmlTemplate?: string
  previewImage?: string
  version: number
  category?: string
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface ITenantSequence {
  _id: mongoose.Types.ObjectId
  name: string
  value: number
}

export interface ITenantSMTPVault {
  _id: mongoose.Types.ObjectId
  organizationId: mongoose.Types.ObjectId
  label?: string
  email: string
  encryptedAppPassword: string
  iv: string
  authTag: string
  isDefault: boolean
  lastUsedAt?: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const EVENT_TYPES = [
  'seminar',
  'workshop',
  'conference',
  'competition',
  'meetup',
  'training',
  'webinar',
  'hackathon',
  'concert',
  'fundraiser',
  'networking',
  'internal',
  'other',
] as const

const eventSchema = new Schema<ITenantEvent>(
  {
    eventCode: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    desc: { type: String },
    items: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    startDate: { type: Date },
    endDate: { type: Date },
    location: { type: String },
    maxPurchases: { type: Number },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

eventSchema.index({ eventCode: 1 }, { unique: true })
eventSchema.index({ isActive: 1 })
eventSchema.index({ type: 1 })
eventSchema.index({ startDate: 1 })

eventSchema.statics.findByEventCode = function (eventCode: string) {
  return this.findOne({ eventCode: eventCode.toUpperCase(), isActive: true })
}

const receiptSchema = new Schema<ITenantReceipt>(
  {
    receiptNumber: { type: String, required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String },
      phone: { type: String },
    },
    items: [
      {
        name: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    taxes: [
      {
        name: { type: String, required: true },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotalAmount: { type: Number },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'other'] },
    templateSlug: { type: String, default: 'professional' },
    qrCodeData: { type: String },
    pdfUrl: { type: String },
    notes: { type: String },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailError: { type: String },
    emailLog: [
      {
        sentTo: { type: String, required: true },
        status: { type: String, enum: ['sent', 'failed'], required: true },
        sentAt: { type: Date, default: Date.now },
        error: { type: String },
        sentByUserId: { type: String },
        sentByUsername: { type: String },
        smtpSender: { type: String },
        smtpVaultId: { type: String },
        messageId: { type: String },
      },
    ],
    refunded: { type: Boolean, default: false },
    refundReason: { type: String },
    refundedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

receiptSchema.index({ receiptNumber: 1 }, { unique: true })
receiptSchema.index({ event: 1 })
receiptSchema.index({ 'customer.email': 1 })
receiptSchema.index({ createdAt: -1 })
receiptSchema.index({ emailSent: 1 })
receiptSchema.index({ refunded: 1 })

const templateSchema = new Schema<ITenantTemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    config: {
      primaryColor: { type: String, default: '#1E40AF' },
      secondaryColor: { type: String },
      logoUrl: { type: String },
      showQrCode: { type: Boolean, default: true },
      footerText: { type: String },
      organizationName: { type: String, default: 'Organization' },
    },
    htmlTemplate: { type: String },
    previewImage: { type: String },
    version: { type: Number, default: 1 },
    category: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

templateSchema.index({ name: 1 })
templateSchema.index({ isDefault: 1 })
templateSchema.index({ category: 1 })

templateSchema.statics.getDefault = function () {
  return this.findOne({ isDefault: true })
}

templateSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug })
}

const sequenceSchema = new Schema<ITenantSequence>({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 1 },
})

const smtpVaultSchema = new Schema<ITenantSMTPVault>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    encryptedAppPassword: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

smtpVaultSchema.index({ organizationId: 1, email: 1 }, { unique: true })
smtpVaultSchema.index({ organizationId: 1, isDefault: 1 })

sequenceSchema.statics.getNext = async function (
  name: string
): Promise<number> {
  const sequence = await this.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  )
  return sequence.value
}

export interface TenantModels {
  Event: Model<ITenantEvent> & {
    findByEventCode(eventCode: string): Promise<ITenantEvent | null>
  }
  Receipt: Model<ITenantReceipt>
  Template: Model<ITenantTemplate> & {
    getDefault(): Promise<ITenantTemplate | null>
    findBySlug(slug: string): Promise<ITenantTemplate | null>
  }
  Sequence: Model<ITenantSequence> & {
    getNext(name: string): Promise<number>
  }
  SMTPVault: Model<ITenantSMTPVault>
}

const modelCache = new Map<string, TenantModels>()

function createModelsForConnection(conn: Connection): TenantModels {
  const Event =
    (conn.models.Event as TenantModels['Event']) ||
    (conn.model('Event', eventSchema) as TenantModels['Event'])
  const Receipt =
    (conn.models.Receipt as TenantModels['Receipt']) ||
    (conn.model('Receipt', receiptSchema) as TenantModels['Receipt'])
  const Template =
    (conn.models.Template as TenantModels['Template']) ||
    (conn.model('Template', templateSchema) as TenantModels['Template'])
  const Sequence =
    (conn.models.Sequence as TenantModels['Sequence']) ||
    (conn.model('Sequence', sequenceSchema) as TenantModels['Sequence'])
  const SMTPVault =
    (conn.models.SMTPVault as TenantModels['SMTPVault']) ||
    (conn.model('SMTPVault', smtpVaultSchema) as TenantModels['SMTPVault'])

  return { Event, Receipt, Template, Sequence, SMTPVault }
}

export async function getTenantModels(slug: string): Promise<TenantModels> {
  const normalizedSlug = slug.toLowerCase()

  if (modelCache.has(normalizedSlug)) {
    return modelCache.get(normalizedSlug)!
  }

  const conn = await getTenantConnection(normalizedSlug)
  const models = createModelsForConnection(conn)
  modelCache.set(normalizedSlug, models)

  return models
}

export function clearModelCache(): void {
  modelCache.clear()
}
