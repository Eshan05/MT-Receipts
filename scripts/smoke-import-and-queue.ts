import dotenv from 'dotenv'
import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'

import dbConnect from '../lib/db-conn'
import Organization from '../models/organization.model'
import User from '../models/user.model'
import { getTenantModels } from '../lib/db/tenant-models'
import { getTenantDbName } from '../lib/db/tenant'
import { parseCSV } from '../utils/csv-parser'
import { enqueueReceiptEmailJobs } from '../lib/queue/receipt-email'

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === name)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

async function main() {
  // Load env for scripts (support both .env.local and .env)
  dotenv.config({ path: '.env.local' })
  dotenv.config()

  const multiplier = Math.max(1, Number(getArg('--multiplier') || '1'))
  const queueCount = Math.max(0, Number(getArg('--queue') || '0'))
  const waitMs = Math.max(0, Number(getArg('--wait-ms') || '0'))
  const cleanup = hasFlag('--cleanup')
  const dropTenantDb = hasFlag('--drop-tenant-db')

  const smokeEmailTo = process.env.SMOKE_EMAIL_TO?.trim()

  if (queueCount > 0 && !smokeEmailTo) {
    throw new Error(
      'Refusing to queue emails without SMOKE_EMAIL_TO set (to avoid spamming the sample CSV addresses).'
    )
  }

  await dbConnect()

  const suffix = Date.now().toString(36).slice(-6)
  const slug = `smoke-${suffix}`

  const username = `smoke_${suffix}`
  const email = `smoke_${suffix}@example.com`
  const passhash = await User.hashPassword(`smoke-${suffix}-password`)

  const user = await User.create({
    username,
    email,
    passhash,
    isSuperAdmin: false,
    memberships: [],
    isActive: true,
    lastSignIn: new Date(),
  })

  const org = await Organization.create({
    slug,
    name: `Smoke Org ${suffix}`,
    settings: {},
    limits: undefined,
    status: 'active',
    createdBy: user._id,
    approvedAt: new Date(),
    approvedBy: user._id,
  })

  const models = await getTenantModels(slug)

  const eventCode = `SMK${suffix.toUpperCase()}`
  const event = await models.Event.create({
    eventCode,
    type: 'workshop',
    name: `Smoke Event ${suffix}`,
    items: [
      { name: 'T-Shirt', description: 'Smoke item', price: 500 },
      { name: 'Cap', description: 'Smoke item', price: 200 },
      { name: 'Workshop Kit', description: 'Smoke item', price: 750 },
      { name: 'Mug', description: 'Smoke item', price: 150 },
      { name: 'Sticker Pack', description: 'Smoke item', price: 50 },
    ],
    isActive: true,
    createdBy: user._id,
  })

  const csvPath = path.join(process.cwd(), 'scripts', 'mock-import.csv')
  const csvTextSmall = await fs.readFile(csvPath, 'utf8')

  const [header, ...dataRows] = csvTextSmall
    .split(/\r?\n/)
    .filter((l) => l.trim())

  const expandedRows: string[] = []
  for (let i = 0; i < multiplier; i++) {
    // Keep the header once; repeat data rows.
    expandedRows.push(...dataRows)
  }

  const csvText = [header, ...expandedRows].join('\n')

  const validation = parseCSV(csvText, event.items)
  if (validation.errors.length) {
    console.warn(
      `CSV validation produced ${validation.errors.length} error(s); importing only valid rows.`
    )
    for (const err of validation.errors.slice(0, 10)) {
      console.warn(
        `  - row ${err.rowNumber}: ${err.field} — ${err.message} (${err.severity})`
      )
    }
  }

  if (validation.warnings.length) {
    console.warn(
      `CSV validation produced ${validation.warnings.length} warning(s).`
    )
  }

  if (validation.rows.length === 0) {
    throw new Error('No valid CSV rows to import')
  }

  const receipts = validation.rows.map((row, idx) => {
    const receiptNumber = `SMOKE-${eventCode}-${idx + 1}`
    const items = row.items.map((i) => ({
      name: i.name,
      description: undefined,
      quantity: i.quantity,
      price: i.price,
      total: i.quantity * i.price,
    }))

    const totalAmount = items.reduce((sum, it) => sum + it.total, 0)

    return {
      receiptNumber,
      event: event._id,
      customer: {
        name: row.customerName,
        email: smokeEmailTo || row.customerEmail,
        address: row.customerAddress || undefined,
        phone: row.customerPhone || undefined,
      },
      items,
      totalAmount,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      emailSent: false,
      emailLog: [],
      refunded: false,
      createdBy: user._id,
    }
  })

  await models.Receipt.insertMany(receipts, { ordered: false })

  console.log(`Created org=${slug}, event=${eventCode}`)
  console.log(
    `Inserted ${receipts.length} receipts from scripts/mock-import.csv x${multiplier} (valid rows only)`
  )

  if (queueCount > 0) {
    const toQueue = receipts.slice(0, queueCount)

    const jobs = toQueue.map((r) => ({
      organizationSlug: slug,
      organizationId: org._id.toString(),
      receiptNumber: r.receiptNumber,
      actor: {
        userId: user._id.toString(),
        username: user.username,
      },
      requestId: `smoke-${suffix}`,
    }))

    const queued = await enqueueReceiptEmailJobs(jobs)
    console.log(
      `Queued ${jobs.length} receipt-email jobs: ${queued.queued ? 'ok' : 'failed'}`
    )

    if (!queued.queued) {
      console.log(`Queue error: ${queued.error}`)
    } else {
      console.log(
        `MessageIds: ${(queued.messageIds || []).slice(0, 5).join(', ')}`
      )
    }

    if (waitMs > 0) {
      console.log(`Waiting ${waitMs}ms before optional cleanup...`)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }

  if (cleanup) {
    await models.Receipt.deleteMany({
      receiptNumber: { $regex: `^SMOKE-${eventCode}-` },
    })
    await models.Event.deleteOne({ _id: event._id })

    if (dropTenantDb) {
      // Drop tenant DB only for smoke slugs.
      await mongoose.connection.useDb(getTenantDbName(slug)).dropDatabase()
    }

    await Organization.deleteOne({ _id: org._id })
    await User.deleteOne({ _id: user._id })

    console.log('Cleanup complete')
  } else {
    console.log('Cleanup skipped (pass --cleanup to delete seeded data)')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
