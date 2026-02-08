import mongoose, { Schema, Document, Model, model } from 'mongoose'
import dbConnect from '@/lib/db-conn'

export interface IOrganizationSettings {
  primaryColor?: string
  secondaryColor?: string
  organizationName?: string
  websiteUrl?: string
  contactEmail?: string
  receiptNumberFormat?: string
  defaultTemplate?: string
  emailFromName?: string
  emailFromAddress?: string
}

export interface IOrganizationLimits {
  maxEvents: number
  maxReceiptsPerMonth: number
  maxUsers: number
}

export type OrganizationStatus = 'pending' | 'active' | 'suspended' | 'deleted'

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId
  slug: string
  name: string
  description?: string
  expectedMembers?: number
  logoUrl?: string
  settings: IOrganizationSettings
  limits: IOrganizationLimits
  status: OrganizationStatus
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  deletedAt?: Date
  restoresBefore?: Date
}

interface IOrganizationModel extends Model<IOrganization> {
  findBySlug(slug: string): Promise<IOrganization | null>
  findActive(): Promise<IOrganization[]>
  findDeleted(): Promise<IOrganization[]>
}

const settingsSchema = new Schema<IOrganizationSettings>(
  {
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#1e40af' },
    organizationName: { type: String },
    websiteUrl: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    receiptNumberFormat: {
      type: String,
      default: 'RCP-{eventCode}-{initials}{seq}',
    },
    defaultTemplate: { type: String },
    emailFromName: { type: String },
    emailFromAddress: { type: String },
  },
  { _id: false }
)

const DEFAULT_LIMITS: IOrganizationLimits = {
  maxEvents: 10,
  maxReceiptsPerMonth: 100,
  maxUsers: 25,
}

const limitsSchema = new Schema<IOrganizationLimits>(
  {
    maxEvents: { type: Number, default: DEFAULT_LIMITS.maxEvents },
    maxReceiptsPerMonth: {
      type: Number,
      default: DEFAULT_LIMITS.maxReceiptsPerMonth,
    },
    maxUsers: { type: Number, default: DEFAULT_LIMITS.maxUsers },
  },
  { _id: false }
)

const organizationSchema = new Schema<IOrganization, IOrganizationModel>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z][a-z0-9]*$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    expectedMembers: {
      type: Number,
      min: 1,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },
    limits: {
      type: limitsSchema,
      default: () => ({ ...DEFAULT_LIMITS }),
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'deleted'],
      default: 'pending',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
    },
    restoresBefore: {
      type: Date,
    },
  },
  { timestamps: true }
)

organizationSchema.index({ status: 1 })
organizationSchema.index({ createdAt: -1 })
organizationSchema.index({ deletedAt: 1 }, { sparse: true })

organizationSchema.statics.findBySlug = async function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() })
}

organizationSchema.statics.findActive = async function () {
  return this.find({ status: 'active' })
}

organizationSchema.statics.findDeleted = async function () {
  return this.find({ status: 'deleted', deletedAt: { $exists: true } })
}

function getOrganizationModel(): IOrganizationModel {
  if (mongoose.models && mongoose.models.Organization) {
    return mongoose.models.Organization as IOrganizationModel
  }
  return model<IOrganization, IOrganizationModel>(
    'Organization',
    organizationSchema
  )
}

const Organization = getOrganizationModel()

export default Organization

export { RESERVED_SLUGS, isSlugReserved } from '@/utils/reserved-slugs'
