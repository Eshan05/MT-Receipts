import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IPurchaseItem {
  itemName: string
  itemDesc?: string
  quantity: number
  price: number
}

export interface IPurchase extends Document {
  purchaseId: string
  event: mongoose.Schema.Types.ObjectId
  customer: {
    name: string
    email: string
    phone?: string
  }
  items: IPurchaseItem[]
  totalAmount: number
  paymentMethod?: 'cash' | 'upi' | 'card' | 'other'
  status: 'pending' | 'completed' | 'cancelled'
  notes?: string
  refundReason?: string
  refundedAt?: Date
  receiptId?: mongoose.Schema.Types.ObjectId
  createdBy?: mongoose.Schema.Types.ObjectId
  createdAt: Date
}

interface IPurchaseModel extends Model<IPurchase> {}

const purchaseSchema = new Schema<IPurchase, IPurchaseModel>(
  {
    purchaseId: { type: String, required: true, unique: true, index: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },
    items: [
      {
        itemName: { type: String, required: true },
        itemDesc: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'other'] },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: { type: String },
    refundReason: { type: String },
    refundedAt: { type: Date },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

purchaseSchema.index({ event: 1 })
purchaseSchema.index({ 'customer.email': 1 })
purchaseSchema.index({ status: 1 })

const Purchase: IPurchaseModel =
  (mongoose.models.Purchase as IPurchaseModel) ||
  model<IPurchase, IPurchaseModel>('Purchase', purchaseSchema)
export default Purchase
