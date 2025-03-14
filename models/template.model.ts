import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface ITemplateConfig {
  primaryColor: string
  secondaryColor?: string
  logoUrl?: string
  showQrCode: boolean
  footerText?: string
  organizationName?: string
}

export interface ITemplate extends Document {
  name: string
  slug: string
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
  findBySlug(slug: string): Promise<ITemplate | null>
}

const templateSchema = new Schema<ITemplate, ITemplateModel>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    config: {
      primaryColor: { type: String, default: '#1E40AF' },
      secondaryColor: { type: String },
      logoUrl: { type: String },
      showQrCode: { type: Boolean, default: true },
      footerText: { type: String },
      organizationName: { type: String, default: 'Organization' },
    },
    htmlTemplate: { type: String },
    previewImage: { type: String },
    version: { type: Number, default: 1 },
    category: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

templateSchema.index({ name: 1 })
templateSchema.index({ slug: 1 }, { unique: true })
templateSchema.index({ isDefault: 1 })
templateSchema.index({ category: 1 })

templateSchema.statics.getDefault = function () {
  return this.findOne({ isDefault: true })
}

templateSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug })
}

const Template: ITemplateModel =
  (mongoose.models.Template as ITemplateModel) ||
  model<ITemplate, ITemplateModel>('Template', templateSchema)
export default Template
