import { beforeAll, afterAll } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import 'dotenv/config'
import mongoose from 'mongoose'

let mongoServer: MongoMemoryServer | null = null

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      systemBinary: process.env.MONGOD_PATH,
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
