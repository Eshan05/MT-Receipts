import 'dotenv/config'
import mongoose from 'mongoose'

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const db = mongoose.connection.db
  if (!db) {
    console.error('No database connection')
    process.exit(1)
  }
  const admin = db.admin()
  const result = await admin.listDatabases()

  console.log('\n📁 Databases on your Atlas cluster:')
  console.log('─'.repeat(50))

  result.databases
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((d) => {
      const size =
        (d.sizeOnDisk ?? 0) > 0
          ? ((d.sizeOnDisk ?? 0) / 1024).toFixed(1) + ' KB'
          : 'empty'
      const marker = d.name.startsWith('org_')
        ? ' 👈 [TENANT]'
        : d.name === 'master'
          ? ' 👈 [MASTER]'
          : ''
      console.log(`  ${d.name}${marker} - ${size}`)
    })

  console.log('─'.repeat(50))
  console.log(`Total: ${result.databases.length} databases\n`)

  await mongoose.disconnect()
}

main().catch(console.error)
