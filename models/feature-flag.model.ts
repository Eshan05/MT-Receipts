import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface IFeatureFlag extends Document {
  name: string
  isEnabled: boolean
  description?: string
  rolloutPercentage?: number
  targetRoles?: ('admin' | 'member')[]
  createdAt: Date
  updatedAt: Date
}

interface IFeatureFlagModel extends Model<IFeatureFlag> {
  isEnabled(name: string): Promise<boolean>
}

const featureFlagSchema = new Schema<IFeatureFlag, IFeatureFlagModel>(
  {
    name: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    description: { type: String },
    rolloutPercentage: { type: Number, min: 0, max: 100 },
    targetRoles: [{ type: String, enum: ['admin', 'member'] }],
  },
  { timestamps: true }
)

featureFlagSchema.index({ name: 1 }, { unique: true })

featureFlagSchema.statics.isEnabled = async function (
  name: string
): Promise<boolean> {
  const flag = await this.findOne({ name })
  return flag?.isEnabled ?? false
}

const FeatureFlag: IFeatureFlagModel =
  (mongoose.models.FeatureFlag as IFeatureFlagModel) ||
  model<IFeatureFlag, IFeatureFlagModel>('FeatureFlag', featureFlagSchema)
export default FeatureFlag
