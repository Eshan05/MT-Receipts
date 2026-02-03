import 'dotenv/config'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'

async function main() {
  await dbConnect()

  const users = await User.find().select(
    'username email currentOrganizationSlug memberships'
  )

  console.log('Users:')
  for (const user of users) {
    console.log(`\n${user.username} (${user.email})`)
    console.log(
      `  currentOrganizationSlug: ${user.currentOrganizationSlug || 'NOT SET'}`
    )
    console.log(`  memberships:`)
    for (const m of user.memberships) {
      console.log(`    - ${m.organizationSlug} (${m.role})`)
    }
  }

  process.exit(0)
}

main().catch(console.error)
