import 'dotenv/config'
import { beforeAll, afterAll } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Make tests hermetic: avoid accidentally hitting real Upstash Redis
// when developers have env vars set locally.
process.env.UPSTASH_REDIS_REST_URL = ''
process.env.UPSTASH_REDIS_REST_TOKEN = ''

let mongoServer: MongoMemoryServer | null = null

beforeAll(async () => {
  if (process.env.SKIP_MONGODB_SETUP === 'true') {
    process.env.SMTP_VAULT_SECRET = 'a'.repeat(32)
    process.env.MASTER_DB_NAME = 'master'
    process.env.TENANT_DB_PREFIX = 'org_'
    return
  }

  mongoServer = await MongoMemoryServer.create({
    binary: {
      systemBinary:
        'C:\\Users\\redma\\scoop\\apps\\mongodb\\current\\bin\\mongod.exe',
      version: '8.0.6',
    },
    instance: {
      launchTimeout: 60000,
    },
  })
  const uri = mongoServer.getUri()

  process.env.MONGODB_URI = uri
  process.env.SMTP_VAULT_SECRET = 'a'.repeat(32)
  process.env.MASTER_DB_NAME = 'master'
  process.env.TENANT_DB_PREFIX = 'org_'
})

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = null
  }
})
