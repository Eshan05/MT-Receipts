import mongoose from 'mongoose'
import { getTenantConnection } from './tenant'
import type { Connection } from 'mongoose'

export interface TenantModels {
  Event: mongoose.Model<any>
  Receipt: mongoose.Model<any>
  Sequence: mongoose.Model<any>
  Template: mongoose.Model<any>
}

const eventSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['seminar', 'workshop', 'conference', 'meetup', 'other'],
      default: 'other',
    },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: { type: String, trim: true },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

eventSchema.index({ code: 1 }, { unique: true })
eventSchema.index({ startDate: 1 })
eventSchema.index({ status: 1 })

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PHP' },
    paymentMethod: {
      type: String,
      enum: ['cash', 'gcash', 'bank_transfer', 'card', 'other'],
      default: 'cash',
    },
    notes: { type: String, trim: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date },
  },
  { timestamps: true }
)

receiptSchema.index({ receiptNumber: 1 }, { unique: true })
receiptSchema.index({ eventId: 1 })
receiptSchema.index({ createdAt: -1 })
receiptSchema.index({ customerEmail: 1 })

const sequenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
)

sequenceSchema.index({ name: 1 }, { unique: true })

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

templateSchema.index({ isDefault: 1 })

const modelCache = new Map<string, TenantModels>()

function createModelsForConnection(
  conn: Connection,
  dbName: string
): TenantModels {
  const Event = conn.model('Event', eventSchema)
  const Receipt = conn.model('Receipt', receiptSchema)
  const Sequence = conn.model('Sequence', sequenceSchema)
  const Template = conn.model('Template', templateSchema)

  return { Event, Receipt, Sequence, Template }
}

export async function getTenantModels(slug: string): Promise<TenantModels> {
  if (modelCache.has(slug)) {
    return modelCache.get(slug)!
  }

  const conn = await getTenantConnection(slug)
  const dbName = conn.name
  const models = createModelsForConnection(conn, dbName)
  modelCache.set(slug, models)

  return models
}

export function clearModelCache(): void {
  modelCache.clear()
}
