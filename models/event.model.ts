import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IEventItem {
  name: string
  description: string
  price: number
}

export interface IEvent extends Document {
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
  items: IEventItem[]
  templateId?: mongoose.Schema.Types.ObjectId
  startDate?: Date
  endDate?: Date
  location?: string
  maxPurchases?: number
  tags?: string[]
  createdBy?: mongoose.Schema.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface IEventModel extends Model<IEvent> {
  findByEventCode(eventCode: string): Promise<IEvent | null>
}

const EventSchema = new Schema<IEvent, IEventModel>(
  {
    eventCode: { type: String, required: true },
    type: {
      type: String,
      enum: [
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
      ],
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
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    startDate: { type: Date },
    endDate: { type: Date },
    location: { type: String },
    maxPurchases: { type: Number },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

EventSchema.index({ eventCode: 1 }, { unique: true })
EventSchema.index({ isActive: 1 })
EventSchema.index({ type: 1 })
EventSchema.index({ startDate: 1 })

EventSchema.statics.findByEventCode = function (eventCode: string) {
  return this.findOne({ eventCode, isActive: true })
}

const Event: IEventModel =
  (mongoose.models.Event as IEventModel) ||
  model<IEvent, IEventModel>('Event', EventSchema)
export default Event
