import mongoose, { Schema, Document, Model, model } from 'mongoose'

export type ReceiptEmailBatchStatus = 'created' | 'enqueued' | 'enqueue_failed'

export interface IReceiptEmailBatch extends Document {
  _id: mongoose.Types.ObjectId
  organizationId: string
  organizationSlug: string
  createdByUserId: string
  subject?: string
  templateSlug?: string
  smtpVaultId?: string
  total: number
  status: ReceiptEmailBatchStatus
  error?: string
  lastActivityAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface IReceiptEmailBatchModel extends Model<IReceiptEmailBatch> {}

const receiptEmailBatchSchema = new Schema<
  IReceiptEmailBatch,
  IReceiptEmailBatchModel
>(
  {
    organizationId: { type: String, required: true, index: true },
    organizationSlug: { type: String, required: true, index: true },
    createdByUserId: { type: String, required: true, index: true },
    subject: { type: String },
    templateSlug: { type: String },
    smtpVaultId: { type: String },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['created', 'enqueued', 'enqueue_failed'],
      default: 'created',
      index: true,
    },
    error: { type: String },
    lastActivityAt: { type: Date },
  },
  { timestamps: true }
)

receiptEmailBatchSchema.index({ organizationSlug: 1, createdAt: -1 })

function getReceiptEmailBatchModel(): IReceiptEmailBatchModel {
  if (mongoose.models && mongoose.models.ReceiptEmailBatch) {
    return mongoose.models.ReceiptEmailBatch as IReceiptEmailBatchModel
  }
  return model<IReceiptEmailBatch, IReceiptEmailBatchModel>(
    'ReceiptEmailBatch',
    receiptEmailBatchSchema
  )
}

const ReceiptEmailBatch = getReceiptEmailBatchModel()

export default ReceiptEmailBatch
