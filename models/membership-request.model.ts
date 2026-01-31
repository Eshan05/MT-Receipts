import mongoose, { Schema, Document, Model, model } from 'mongoose'

export type InviteType = 'email' | 'code'

export type MembershipRequestStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'cancelled'

export interface IMembershipRequest extends Document {
  organizationId: mongoose.Types.ObjectId
  organizationSlug: string
  type: InviteType
  email?: string
  code?: string
  invitedBy: mongoose.Types.ObjectId
  role: 'admin' | 'member'
  status: MembershipRequestStatus
  expiresAt?: Date
  maxUses?: number
  usedCount: number
  acceptedBy?: mongoose.Types.ObjectId
  acceptedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface IMembershipRequestModel extends Model<IMembershipRequest> {
  findValidByCode(code: string): Promise<IMembershipRequest | null>
  findValidByEmail(
    email: string,
    organizationId: mongoose.Types.ObjectId
  ): Promise<IMembershipRequest | null>
}

const membershipRequestSchema = new Schema<
  IMembershipRequest,
  IMembershipRequestModel
>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    organizationSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['email', 'code'],
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      trim: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
      default: 'member',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
    },
    maxUses: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    acceptedAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

membershipRequestSchema.index({ organizationId: 1, status: 1 })
membershipRequestSchema.index({ code: 1 }, { sparse: true, unique: true })
membershipRequestSchema.index({ email: 1, organizationId: 1 }, { sparse: true })
membershipRequestSchema.index({ expiresAt: 1 }, { sparse: true })

membershipRequestSchema.statics.findValidByCode = async function (
  code: string
) {
  return this.findOne({
    code: code,
    type: 'code',
    status: 'pending',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
    $expr: { $lt: ['$usedCount', '$maxUses'] },
  })
}

membershipRequestSchema.statics.findValidByEmail = async function (
  email: string,
  organizationId: mongoose.Types.ObjectId
) {
  return this.findOne({
    email: email.toLowerCase(),
    organizationId: organizationId,
    type: 'email',
    status: 'pending',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  })
}

const MembershipRequest: IMembershipRequestModel =
  (mongoose.models.MembershipRequest as IMembershipRequestModel) ||
  model<IMembershipRequest, IMembershipRequestModel>(
    'MembershipRequest',
    membershipRequestSchema
  )

export default MembershipRequest
