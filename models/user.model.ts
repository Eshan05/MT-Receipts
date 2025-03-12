import mongoose, { Schema, Document, model, Model } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IUser extends Document {
  username: string
  email: string
  passhash: string
  role: 'admin' | 'member'
  avatar?: string
  isActive: boolean
  lastSignIn: Date
  createdAt: Date
}

interface IUserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>
  comparePassword(password: string, passhash: string): Promise<boolean>
}

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
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    avatar: { type: String }, // Store as Base64 string or URL
    isActive: { type: Boolean, default: true },
    lastSignIn: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ username: 1 }, { unique: true })
userSchema.index({ isActive: 1 })

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
