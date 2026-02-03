import mongoose from 'mongoose'

const getMongoUri = () => {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI)
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    )
  return MONGODB_URI
}

// @ts-expect-error ts(7017)
let cached = global.mongoose
// @ts-expect-error ts(7017)
if (!cached) cached = global.mongoose = { conn: null, promise: null }

async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    const opts = { bufferCommands: false }
    cached.promise = mongoose.connect(getMongoUri(), opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect
