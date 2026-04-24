import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IReceiptVerificationIndex extends Document {
  receiptNumber: string
  organizationSlug: string
  lastVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface IReceiptVerificationIndexModel extends Model<IReceiptVerificationIndex> {}

const receiptVerificationIndexSchema = new Schema<
  IReceiptVerificationIndex,
  IReceiptVerificationIndexModel
>(
  {
    receiptNumber: { type: String, required: true },
    organizationSlug: { type: String, required: true, lowercase: true },
    lastVerifiedAt: { type: Date },
  },
  { timestamps: true }
)

receiptVerificationIndexSchema.index({ receiptNumber: 1 }, { unique: true })
receiptVerificationIndexSchema.index({ organizationSlug: 1 })
receiptVerificationIndexSchema.index({ lastVerifiedAt: -1 }, { sparse: true })

const ReceiptVerificationIndex: IReceiptVerificationIndexModel =
  (mongoose.models
    .ReceiptVerificationIndex as IReceiptVerificationIndexModel) ||
  model<IReceiptVerificationIndex, IReceiptVerificationIndexModel>(
    'ReceiptVerificationIndex',
    receiptVerificationIndexSchema
  )

export default ReceiptVerificationIndex
