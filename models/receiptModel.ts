import mongoose, { Schema, Model, model, Document } from 'mongoose'

export interface IReceiptItem {
  description: string
  quantity: number
  price: number
}

export interface IEmailLogEntry {
  emailSentTo: string
  status: 'sent' | 'failed'
  sentAt: Date
}

export interface IReceipt extends Document {
  receiptCode: string
  eventId?: mongoose.Schema.Types.ObjectId
  purchaseIds: string[]
  templateId: mongoose.Schema.Types.ObjectId
  customer: {
    name: string
    email: string
    phoneNumber?: string
  }
  items: IReceiptItem[]
  totalAmount: number
  paymentMethod?: string
  createdAt: Date
  emailLog: IEmailLogEntry[]
}

const receiptSchema = new Schema<IReceipt>(
  {
    receiptCode: { type: String, required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    purchaseIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Event.purchases' },
    ],
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReceiptTemplate',
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phoneNumber: { type: String },
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String },
    createdAt: { type: Date, default: Date.now },
    emailLog: [
      {
        emailSentTo: { type: String, required: true },
        status: { type: String, enum: ['sent', 'failed'], required: true },
        sentAt: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
)

receiptSchema.index({ receiptCode: 1 }, { unique: true })
receiptSchema.index({ eventId: 1 })
receiptSchema.index({ templateId: 1 })
receiptSchema.index({ 'customer.email': 1 })
receiptSchema.index({ purchaseIds: 1 })

const Receipt = model<IReceipt>('Receipt', receiptSchema)
export default Receipt
