import 'dotenv/config'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import { setCachedOrganization } from '@/lib/redis'

async function main() {
  console.log('Caching all organizations in Redis...')

  await dbConnect()

  const orgs = await Organization.find({ status: { $ne: 'deleted' } })

  console.log(`Found ${orgs.length} organizations`)

  for (const org of orgs) {
    await setCachedOrganization(org.slug, {
      id: (org._id as any).toString(),
      slug: org.slug,
      name: org.name,
      status: org.status,
    })
    console.log(`  ✓ Cached: ${org.slug} (${org.name})`)
  }

  console.log('\nDone! All organizations cached.')
  process.exit(0)
}
