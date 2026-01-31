import mongoose, { Document, Model, Schema, model } from 'mongoose'

export interface ISMTPVault extends Document {
  organizationId: mongoose.Types.ObjectId
  label: string
  email: string
  encryptedAppPassword: string
  iv: string
  authTag: string
  isDefault: boolean
  lastUsedAt?: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

interface ISMTPVaultModel extends Model<ISMTPVault> {}

const smtpVaultSchema = new Schema<ISMTPVault, ISMTPVaultModel>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    encryptedAppPassword: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

smtpVaultSchema.index({ organizationId: 1, email: 1 }, { unique: true })
smtpVaultSchema.index({ organizationId: 1, isDefault: 1 })

const SMTPVault: ISMTPVaultModel =
  (mongoose.models.SMTPVault as ISMTPVaultModel) ||
  model<ISMTPVault, ISMTPVaultModel>('SMTPVault', smtpVaultSchema)

export default SMTPVault
