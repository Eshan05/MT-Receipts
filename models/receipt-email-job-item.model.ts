import mongoose, { Schema, Document, Model, model } from 'mongoose'

export type ReceiptEmailJobItemStatus =
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'skipped'

export interface IReceiptEmailJobItem extends Document {
  _id: mongoose.Types.ObjectId
  batchId: string
  organizationId: string
  organizationSlug: string
  receiptNumber: string
  status: ReceiptEmailJobItemStatus
  attempts: number
  lastError?: string
  lastTriedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface IReceiptEmailJobItemModel extends Model<IReceiptEmailJobItem> {}

const receiptEmailJobItemSchema = new Schema<
  IReceiptEmailJobItem,
  IReceiptEmailJobItemModel
>(
  {
    batchId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    organizationSlug: { type: String, required: true, index: true },
    receiptNumber: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'queued',
        'processing',
        'retrying',
        'succeeded',
        'failed',
        'skipped',
      ],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    lastTriedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

receiptEmailJobItemSchema.index(
  { batchId: 1, receiptNumber: 1 },
  { unique: true }
)
receiptEmailJobItemSchema.index({
  organizationSlug: 1,
  status: 1,
  updatedAt: -1,
})

function getReceiptEmailJobItemModel(): IReceiptEmailJobItemModel {
  if (mongoose.models && mongoose.models.ReceiptEmailJobItem) {
    return mongoose.models.ReceiptEmailJobItem as IReceiptEmailJobItemModel
  }
  return model<IReceiptEmailJobItem, IReceiptEmailJobItemModel>(
    'ReceiptEmailJobItem',
    receiptEmailJobItemSchema
  )
}

const ReceiptEmailJobItem = getReceiptEmailJobItemModel()

export default ReceiptEmailJobItem
