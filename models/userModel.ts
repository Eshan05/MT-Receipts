import mongoose, { Schema, Document, model, Model } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IUser extends Document {
  username: string
  email: string
  passhash: string
  lastLogin: Date
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
    lastLogin: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ username: 1 }, { unique: true })

userSchema.pre('save', async function (next) {
  if (this.isModified('passhash')) {
    const saltRounds = 5
    this.passhash = await bcrypt.hash(this.passhash, saltRounds)
  }
  next()
})

userSchema.statics.hashPassword = async function (
  password: string
): Promise<string> {
  const saltRounds = 5
  return await bcrypt.hash(password, 5)
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
