import mongoose, { Schema, Document, Model, model } from 'mongoose'

export type SystemLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ISystemLog extends Document {
  _id: mongoose.Types.ObjectId
  level: SystemLogLevel
  kind: string
  message: string
  organizationId?: string
  organizationSlug?: string
  batchId?: string
  receiptNumber?: string
  requestId?: string
  meta?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

interface ISystemLogModel extends Model<ISystemLog> {}

const systemLogSchema = new Schema<ISystemLog, ISystemLogModel>(
  {
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error'],
      required: true,
      index: true,
    },
    kind: { type: String, required: true, index: true },
    message: { type: String, required: true },
    organizationId: { type: String, index: true },
    organizationSlug: { type: String, index: true },
    batchId: { type: String, index: true },
    receiptNumber: { type: String, index: true },
    requestId: { type: String, index: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

systemLogSchema.index({ createdAt: -1 })

function getSystemLogModel(): ISystemLogModel {
  if (mongoose.models && mongoose.models.SystemLog) {
    return mongoose.models.SystemLog as ISystemLogModel
  }
  return model<ISystemLog, ISystemLogModel>('SystemLog', systemLogSchema)
}

const SystemLog = getSystemLogModel()

export default SystemLog
