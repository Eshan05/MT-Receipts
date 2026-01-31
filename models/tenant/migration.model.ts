import mongoose, { Schema, Document, Model, model } from 'mongoose'

export interface IMigration extends Document {
  name: string
  appliedAt: Date
  duration?: number
  checksum: string
}

interface IMigrationModel extends Model<IMigration> {
  findApplied(): Promise<IMigration[]>
  isApplied(name: string): Promise<boolean>
}

const migrationSchema = new Schema<IMigration, IMigrationModel>(
  {
    name: {
      type: String,
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: Number,
    },
    checksum: {
      type: String,
      required: true,
    },
  },
  { timestamps: false }
)

migrationSchema.index({ name: 1 }, { unique: true })

migrationSchema.statics.findApplied = async function () {
  return this.find({}).sort({ appliedAt: 1 })
}

migrationSchema.statics.isApplied = async function (name: string) {
  const migration = await this.findOne({ name })
  return !!migration
}

export function createMigrationModel(db: mongoose.Connection): IMigrationModel {
  return db.model<IMigration, IMigrationModel>('Migration', migrationSchema)
}

const Migration: IMigrationModel =
  (mongoose.models.Migration as IMigrationModel) ||
  model<IMigration, IMigrationModel>('Migration', migrationSchema)

export default Migration
