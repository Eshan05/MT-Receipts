import 'dotenv/config'
import { redis } from '@/lib/redis'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'

async function main() {
  console.log('=== Checking Redis Cache ===')

  const keys = await redis.keys('org:*')
  console.log('Keys found:', keys)

  for (const key of keys) {
    const value = await redis.get(key)
    console.log(`${key}:`, value)
  }

  console.log('\n=== Checking Database ===')
  await dbConnect()

  const orgs = await Organization.find()
  console.log(`Found ${orgs.length} organizations in DB:`)
  for (const org of orgs) {
    console.log(`  - ${org.slug} (${org.name}) - status: ${org.status}`)
  }

  process.exit(0)
}

main().catch(console.error)
