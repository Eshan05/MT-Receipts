import mongoose, { Schema, Document, Model, model } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IMembership {
  organizationId: mongoose.Types.ObjectId
  organizationSlug: string
  role: 'admin' | 'member'
  approvedAt?: Date
}

export interface IUser extends Document {
  username: string
  email: string
  passhash: string
  isSuperAdmin: boolean
  memberships: IMembership[]
  currentOrganizationSlug?: string
  avatar?: string
  isActive: boolean
  lastSignIn: Date
  createdAt: Date
}

interface IUserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>
  comparePassword(password: string, passhash: string): Promise<boolean>
}

const membershipSchema = new Schema<IMembership>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    organizationSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
      default: 'member',
    },
    approvedAt: {
      type: Date,
    },
  },
  { _id: false }
)

const userSchema = new Schema<IUser, IUserModel>(
  {
    username: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passhash: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    memberships: [membershipSchema],
    currentOrganizationSlug: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    lastSignIn: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ username: 1 }, { unique: true })
userSchema.index({ isActive: 1 })
userSchema.index({ 'memberships.organizationId': 1 })
userSchema.index({ isSuperAdmin: 1 })

userSchema.statics.hashPassword = async function (
  password: string
): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

userSchema.statics.comparePassword = async function (
  password: string,
  passhash: string
): Promise<boolean> {
  return await bcrypt.compare(password, passhash)
}

const User: IUserModel =
  (mongoose.models.User as IUserModel) ||
  model<IUser, IUserModel>('User', userSchema)
export default User
