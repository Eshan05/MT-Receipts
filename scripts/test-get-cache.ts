import 'dotenv/config'
import { getCachedOrganization } from '@/lib/redis'

async function main() {
  console.log('Testing getCachedOrganization...')

  const org = await getCachedOrganization('aces')
  console.log('Result for "aces":', org)

  const orgUpper = await getCachedOrganization('ACES')
  console.log('Result for "ACES":', orgUpper)

  process.exit(0)
}

main().catch(console.error)
