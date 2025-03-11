import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IEventItem {
  name: string
  description: string
  price: number
}

export interface IPurchaseItem {
  itemId: string
  itemName: string
  itemDesc?: string
  quantity: number
  price: number
}

export interface IPurchase {
  purchaseId: string
  user: {
    name?: string
    email?: string
    phone?: string
  }
  paymentMethod?: string
  items: IPurchaseItem[]
  timestamp: Date
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
}

export interface IItemAnalytics {
  itemName: string
  totalSold: number
  totalRevenue: number
}

export interface IEvent extends Document {
  eventCode: number
  type: 'seminar' | 'workshop' | 'other'
  name: string
  desc?: string
  items: IEventItem[]
  createdAt: Date
  purchases: IPurchase[]
  itemAnalytics: IItemAnalytics[]
  isDeleted: boolean
  deletedAt?: Date
}

interface IEventModel extends Model<IEvent> {
  findByEventCodeNotDeleted(eventCode: number): Promise<IEvent | null>
}

const EventSchema = new Schema<IEvent, IEventModel>(
  {
    eventCode: { type: Number, required: true, unique: true },
    type: {
      type: String,
      enum: ['seminar', 'workshop', 'other'],
      required: true,
    },
    name: { type: String, required: true },
    desc: { type: String },
    items: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    purchases: [
      {
        purchaseId: { type: String, required: true, unique: true },
        user: {
          name: { type: String },
          email: { type: String },
          phone: { type: String },
        },
        paymentMethod: { type: String },
        items: [
          {
            itemId: { type: String, required: true },
            itemName: { type: String, required: true },
            itemDesc: { type: String },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
          },
        ],
        timestamp: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['pending', 'completed', 'cancelled', 'refunded'],
          default: 'pending',
        },
      },
    ],
    itemAnalytics: [
      {
        itemName: { type: String },
        totalSold: { type: Number },
        totalRevenue: { type: Number },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
)

EventSchema.index({ eventCode: 1 }, { unique: true })
EventSchema.index({ isDeleted: 1 })
EventSchema.index({ 'purchases.purchaseId': 1 })
EventSchema.index({ 'purchases.user.email': 1 })
EventSchema.index({ 'itemAnalytics.itemName': 1 })

EventSchema.statics.findByEventCodeNotDeleted = function (eventCode: number) {
  return this.findOne({ eventCode, isDeleted: false })
}

EventSchema.pre('findOneAndUpdate', async function (next) {
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

EventSchema.pre('save', async function (next) {
  if (this.isModified('purchases')) {
    this.itemAnalytics = calculateItemAnalytics(this.purchases)
  }
  next()
})

function calculateItemAnalytics(purchases: IPurchase[]): IItemAnalytics[] {
  const analytics: {
    [itemName: string]: { totalSold: number; totalRevenue: number }
  } = {}

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      if (!analytics[item.itemName]) {
        analytics[item.itemName] = { totalSold: 0, totalRevenue: 0 }
      }
      analytics[item.itemName].totalSold += item.quantity
      analytics[item.itemName].totalRevenue += item.quantity * item.price
    }
  }

  return Object.entries(analytics).map(([itemName, data]) => ({
    itemName,
    ...data,
  }))
}

const Event: IEventModel =
  (mongoose.models.Event as IEventModel) ||
  model<IEvent, IEventModel>('Event', EventSchema)
export default Event
