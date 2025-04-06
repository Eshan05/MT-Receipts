import mongoose, { Document, Model, Schema, model } from 'mongoose'

export interface ISMTPVault extends Document {
  name: string
  email: string
  encryptedAppPassword: string
  isDefault: boolean
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface ISMTPVaultModel extends Model<ISMTPVault> {}

const smtpVaultSchema = new Schema<ISMTPVault, ISMTPVaultModel>(
  {
    name: {
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
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

smtpVaultSchema.index({ email: 1 }, { unique: true })
smtpVaultSchema.index({ isDefault: 1 })

const SMTPVault: ISMTPVaultModel =
  (mongoose.models.SMTPVault as ISMTPVaultModel) ||
  model<ISMTPVault, ISMTPVaultModel>('SMTPVault', smtpVaultSchema)

export default SMTPVault
