import mongoose, { Document, Schema, model, Model } from 'mongoose'

interface IReceiptTemplate extends Document {
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  templateType: 'event' | 'one-off'
  isDeleted: boolean
  deletedAt?: Date
}

const ReceiptTemplateSchema = new Schema<IReceiptTemplate>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    templateType: {
      type: String,
      enum: ['event', 'one-off'],
      default: 'event',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
)

ReceiptTemplateSchema.index({ name: 1 }, { unique: true })
ReceiptTemplateSchema.index({ isActive: 1 })
ReceiptTemplateSchema.index({ isDeleted: 1 })

ReceiptTemplateSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate()
  if (
    update &&
    '$set' in update &&
    update.$set &&
    'isDeleted' in update.$set &&
    update.$set.isDeleted
  ) {
    this.setUpdate({
      ...update,
      $set: { ...update.$set, deletedAt: new Date() },
    })
  }
  next()
})

ReceiptTemplateSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date()
  }
  next()
})

export const ReceiptTemplate: Model<IReceiptTemplate> =
  (mongoose.models.ReceiptTemplate as Model<IReceiptTemplate>) ||
  model<IReceiptTemplate>('ReceiptTemplate', ReceiptTemplateSchema)
export default ReceiptTemplate
