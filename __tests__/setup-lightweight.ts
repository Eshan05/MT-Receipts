import { beforeAll } from 'vitest'
import 'dotenv/config'

beforeAll(async () => {
  process.env.SMTP_VAULT_SECRET = 'a'.repeat(32)
  process.env.MASTER_DB_NAME = 'master'
  process.env.TENANT_DB_PREFIX = 'org_'
})
