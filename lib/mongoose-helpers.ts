import mongoose from 'mongoose'

export type WithId<T> = T & { _id: mongoose.Types.ObjectId }

export function getObjectIdString(
  id: mongoose.Types.ObjectId | string
): string {
  return typeof id === 'string' ? id : id.toString()
}

export function toObjectId(
  id: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
}
