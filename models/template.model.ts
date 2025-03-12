import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface ITemplateConfig {
  primaryColor: string
  logoUrl?: string
  showQrCode: boolean
  footerText?: string
}

export interface ITemplate extends Document {
  name: string
  description?: string
  isDefault: boolean
  config: ITemplateConfig
  htmlTemplate?: string
  previewImage?: string
  version: number
  category?: string
  createdBy?: mongoose.Schema.Types.ObjectId
  createdAt: Date
}

interface ITemplateModel extends Model<ITemplate> {
  getDefault(): Promise<ITemplate | null>
}

const templateSchema = new Schema<ITemplate, ITemplateModel>(
  {
    name: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    config: {
      primaryColor: { type: String, default: '#000000' },
      logoUrl: { type: String },
      showQrCode: { type: Boolean, default: true },
      footerText: { type: String },
    },
    htmlTemplate: { type: String },
    previewImage: { type: String },
    version: { type: Number, default: 1 },
    category: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

templateSchema.index({ name: 1 }, { unique: true })
templateSchema.index({ isDefault: 1 })
templateSchema.index({ category: 1 })

templateSchema.statics.getDefault = function () {
  return this.findOne({ isDefault: true })
}

const Template: ITemplateModel =
  (mongoose.models.Template as ITemplateModel) ||
  model<ITemplate, ITemplateModel>('Template', templateSchema)
export default Template
