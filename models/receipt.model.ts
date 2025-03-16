import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IEmailLog {
  sentTo: string
  status: 'sent' | 'failed'
  sentAt: Date
  error?: string
}

export interface IReceiptItem {
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}

export interface IReceipt extends Document {
  receiptNumber: string
  event: mongoose.Schema.Types.ObjectId
  customer: {
    name: string
    email: string
    address?: string
    phone?: string
  }
  items: IReceiptItem[]
  totalAmount: number
  paymentMethod?: 'cash' | 'upi' | 'card' | 'other'
  templateSlug?: string
  qrCodeData?: string
  pdfUrl?: string
  notes?: string
  emailSent: boolean
  emailSentAt?: Date
  emailError?: string
  emailLog: IEmailLog[]
  refunded: boolean
  refundReason?: string
  refundedAt?: Date
  createdBy?: mongoose.Schema.Types.ObjectId
  createdAt: Date
}

interface IReceiptModel extends Model<IReceipt> {}

const receiptSchema = new Schema<IReceipt, IReceiptModel>(
  {
    receiptNumber: { type: String, required: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
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
      },
    ],
    refunded: { type: Boolean, default: false },
    refundReason: { type: String },
    refundedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

receiptSchema.index({ receiptNumber: 1 }, { unique: true })
receiptSchema.index({ event: 1 })
receiptSchema.index({ 'customer.email': 1 })
receiptSchema.index({ createdAt: -1 })
receiptSchema.index({ emailSent: 1 })
receiptSchema.index({ refunded: 1 })

const Receipt: IReceiptModel =
  (mongoose.models.Receipt as IReceiptModel) ||
  model<IReceipt, IReceiptModel>('Receipt', receiptSchema)
export default Receipt
