import mongoose from 'mongoose'

const MASTER_DB_NAME = process.env.MASTER_DB_NAME || 'master'

interface CachedConnection {
  conn: mongoose.Connection | null
  promise: Promise<mongoose.Connection> | null
}

declare global {
  var masterDbCached: CachedConnection | undefined
}

let cached: CachedConnection = globalThis.masterDbCached || {
  conn: null,
  promise: null,
}

if (!globalThis.masterDbCached) {
  globalThis.masterDbCached = cached
}

export async function getMasterConnection(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const MONGODB_URI = process.env.MONGODB_URI
    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable')
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        dbName: MASTER_DB_NAME,
      })
      .then((mongoose) => mongoose.connection)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export function resetMasterConnection(): void {
  cached.conn = null
  cached.promise = null
}

export default getMasterConnection
