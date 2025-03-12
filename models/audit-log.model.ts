import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IAuditLog extends Document {
  user: mongoose.Schema.Types.ObjectId
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EMAIL_SENT'
    | 'EMAIL_FAILED'
  resourceType: 'USER' | 'EVENT' | 'PURCHASE' | 'RECEIPT' | 'TEMPLATE'
  resourceId?: mongoose.Schema.Types.ObjectId
  details?: Record<string, unknown>
  status?: 'SUCCESS' | 'FAILURE'
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

interface IAuditLogModel extends Model<IAuditLog> {}

const auditLogSchema = new Schema<IAuditLog, IAuditLogModel>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'EMAIL_SENT',
        'EMAIL_FAILED',
      ],
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['USER', 'EVENT', 'PURCHASE', 'RECEIPT', 'TEMPLATE'],
      required: true,
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['SUCCESS', 'FAILURE'] },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

auditLogSchema.index({ user: 1 })
auditLogSchema.index({ action: 1 })
auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1 })

const AuditLog: IAuditLogModel =
  (mongoose.models.AuditLog as IAuditLogModel) ||
  model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema)
export default AuditLog
