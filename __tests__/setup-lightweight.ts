import { beforeAll } from 'vitest'
import 'dotenv/config'

// Make tests hermetic: avoid accidentally hitting real Upstash Redis
// when developers have env vars set locally.
process.env.UPSTASH_REDIS_REST_URL = ''
process.env.UPSTASH_REDIS_REST_TOKEN = ''

beforeAll(async () => {
  process.env.SMTP_VAULT_SECRET = 'a'.repeat(32)
  process.env.MASTER_DB_NAME = 'master'
  process.env.TENANT_DB_PREFIX = 'org_'
})
