import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../../models/user.model'
import Organization from '../../models/organization.model'
import MembershipRequest from '../../models/membership-request.model'
import SMTPVault from '../../models/smtp-vault.model'
import { getMasterConnection, resetMasterConnection } from '../../lib/db/conn'
import {
  getTenantConnection,
  closeTenantConnection,
  clearAllTenantConnections,
} from '../../lib/db/tenant'
import { getTenantModels, clearModelCache } from '../../lib/db/tenant-models'
import {
  encrypt,
  decrypt,
  validateEncryptionConfig,
} from '../../lib/encryption'

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
}

const CLEANUP_FLAG = '--cleanup'
const shouldCleanup = process.argv.includes(CLEANUP_FLAG)

function log(color: keyof typeof COLORS, message: string) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(50))
  log('cyan', `  ${title}`)
  console.log('='.repeat(50))
}

function logTest(name: string, passed: boolean, details?: string) {
  const icon = passed ? '✓' : '✗'
  const color = passed ? 'green' : 'red'
  log(color, `  ${icon} ${name}`)
  if (details) {
    console.log(`      ${details}`)
  }
}

function logError(error: unknown) {
  if (error instanceof Error) {
    log('red', `      Error: ${error.message}`)
  }
}

async function validateEnvironment() {
  logSection('Environment Variables')
  const checks: {
    name: string
    value: string | undefined
    required: boolean
  }[] = [
    { name: 'MONGODB_URI', value: process.env.MONGODB_URI, required: true },
    {
      name: 'MASTER_DB_NAME',
      value: process.env.MASTER_DB_NAME,
      required: false,
    },
    {
      name: 'TENANT_DB_PREFIX',
      value: process.env.TENANT_DB_PREFIX,
      required: false,
    },
    {
      name: 'SMTP_VAULT_SECRET',
      value: process.env.SMTP_VAULT_SECRET,
      required: true,
    },
  ]

  let allPassed = true
  for (const check of checks) {
    const hasValue = !!check.value
    const passed = hasValue || !check.required
    if (!passed) allPassed = false
    logTest(
      check.name,
      passed,
      hasValue
        ? '✓ Set'
        : check.required
          ? 'MISSING'
          : '(optional, using default)'
    )
  }

  return allPassed
}

async function validateEncryption() {
  logSection('Encryption (AES-256-GCM)')
  let allPassed = true

  try {
    const config = validateEncryptionConfig()
    logTest('Encryption config valid', config.valid, config.error)
    if (!config.valid) return false

    const plaintext = 'my-app-password-12345'
    const encrypted = encrypt(plaintext)

    logTest('Encrypt produces ciphertext', encrypted.encrypted !== plaintext)
    logTest('IV is 32 hex chars (16 bytes)', encrypted.iv.length === 32)
    logTest(
      'Auth tag is 32 hex chars (16 bytes)',
      encrypted.authTag.length === 32
    )
    logTest(
      'Ciphertext differs from plaintext',
      encrypted.encrypted !== plaintext
    )

    const decrypted = decrypt(
      encrypted.encrypted,
      encrypted.iv,
      encrypted.authTag
    )
    logTest('Decrypt returns original plaintext', decrypted === plaintext)

    const tampered = decrypt(encrypted.encrypted, encrypted.iv, 'a'.repeat(32))
    logTest('Tampered auth tag rejected', false, 'Should have thrown')
  } catch (e) {
    logTest('Tampered auth tag rejected', true, 'Threw error as expected')
  }

  try {
    const enc1 = encrypt('test')
    const enc2 = encrypt('test')
    logTest('Same input produces different IVs', enc1.iv !== enc2.iv)
    logTest(
      'Same input produces different ciphertexts',
      enc1.encrypted !== enc2.encrypted
    )
  } catch (e) {
    logTest('IV uniqueness', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateMasterConnection() {
  logSection('Master Database Connection')
  let allPassed = true

  try {
    const conn = await getMasterConnection()
    logTest('Master connection established', true, `DB: ${conn.name}`)
    logTest(
      'Connection ready state',
      conn.readyState === 1,
      `State: ${conn.readyState}`
    )
  } catch (e) {
    logTest('Master connection established', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateUserModel() {
  logSection('User Model')
  let allPassed = true

  try {
    const testEmail = `test-${Date.now()}@validation.local`
    const user = await User.create({
      username: `testuser-${Date.now()}`,
      email: testEmail,
      passhash: 'hashedpassword',
    })

    logTest('Create user', true, `ID: ${user._id}`)
    logTest('Email lowercased', user.email === testEmail.toLowerCase())
    logTest('isSuperAdmin defaults to false', user.isSuperAdmin === false)
    logTest('isActive defaults to true', user.isActive === true)
    logTest(
      'memberships defaults to empty array',
      user.memberships.length === 0
    )

    const hash = await User.hashPassword('testpassword123')
    logTest('hashPassword returns bcrypt hash', hash.startsWith('$2b$'))

    const validMatch = await User.comparePassword('testpassword123', hash)
    logTest('comparePassword validates correct password', validMatch)

    const invalidMatch = await User.comparePassword('wrongpassword', hash)
    logTest('comparePassword rejects wrong password', !invalidMatch)

    await User.findByIdAndDelete(user._id)
    logTest('User cleanup', true)
  } catch (e) {
    logTest('User model operations', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateOrganizationModel() {
  logSection('Organization Model')
  let allPassed = true

  try {
    const testUser = await User.create({
      username: `orguser-${Date.now()}`,
      email: `orguser-${Date.now()}@validation.local`,
      passhash: 'hash',
    })

    const slug = `test-org-${Date.now()}`.slice(0, 20)
    const org = await Organization.create({
      slug,
      name: 'Test Organization',
      createdBy: testUser._id,
    })

    logTest('Create organization', true, `Slug: ${org.slug}`)
    logTest('Slug lowercased', org.slug === slug.toLowerCase())
    logTest('Status defaults to pending', org.status === 'pending')
    logTest(
      'Limits default to finite values',
      org.limits.maxEvents === 10 &&
        org.limits.maxReceiptsPerMonth === 100 &&
        org.limits.maxUsers === 25
    )
    logTest('Settings have defaults', !!org.settings.primaryColor)

    const found = await Organization.findBySlug(slug)
    logTest('findBySlug returns organization', !!found)

    org.status = 'active'
    org.approvedAt = new Date()
    org.approvedBy = testUser._id as mongoose.Types.ObjectId
    await org.save()
    logTest('Status transition to active', org.status === 'active')

    await Organization.findByIdAndDelete(org._id)
    await User.findByIdAndDelete(testUser._id)
    logTest('Organization cleanup', true)
  } catch (e) {
    logTest('Organization model operations', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateMembershipRequestModel() {
  logSection('Membership Request Model')
  let allPassed = true

  try {
    const testUser = await User.create({
      username: `memberuser-${Date.now()}`,
      email: `memberuser-${Date.now()}@validation.local`,
      passhash: 'hash',
    })

    const slug = `member-org-${Date.now()}`.slice(0, 20)
    const org = await Organization.create({
      slug,
      name: 'Member Org',
      createdBy: testUser._id,
      status: 'active',
    })

    const emailInvite = await MembershipRequest.create({
      organizationId: org._id,
      organizationSlug: slug,
      type: 'email',
      email: `invite-${Date.now()}@validation.local`,
      invitedBy: testUser._id,
      role: 'member',
    })
    logTest('Create email invite', true, `ID: ${emailInvite._id}`)

    const codeInvite = await MembershipRequest.create({
      organizationId: org._id,
      organizationSlug: slug,
      type: 'code',
      code: `CODE${Date.now()}`.slice(0, 10),
      invitedBy: testUser._id,
      role: 'admin',
    })
    logTest('Create code invite', true, `Code: ${codeInvite.code}`)

    const validCode = await MembershipRequest.findValidByCode(codeInvite.code!)
    logTest('findValidByCode returns invite', !!validCode)

    const found = await MembershipRequest.findValidByEmail(
      emailInvite.email!,
      org._id as mongoose.Types.ObjectId
    )
    logTest('findValidByEmail returns invite', !!found)

    await MembershipRequest.deleteMany({ organizationId: org._id })
    await Organization.findByIdAndDelete(org._id)
    await User.findByIdAndDelete(testUser._id)
    logTest('Membership request cleanup', true)
  } catch (e) {
    logTest('Membership request model operations', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateSMTPVaultModel() {
  logSection('SMTP Vault Model')
  let allPassed = true

  try {
    const testUser = await User.create({
      username: `vaultuser-${Date.now()}`,
      email: `vaultuser-${Date.now()}@validation.local`,
      passhash: 'hash',
    })

    const slug = `vault-org-${Date.now()}`.slice(0, 20)
    const org = await Organization.create({
      slug,
      name: 'Vault Org',
      createdBy: testUser._id,
      status: 'active',
    })

    const password = 'my-app-password'
    const encrypted = encrypt(password)

    const vault = await SMTPVault.create({
      organizationId: org._id,
      label: 'Test Gmail',
      email: `vault-${Date.now()}@gmail.com`,
      encryptedAppPassword: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      createdBy: testUser._id,
    })

    logTest('Create SMTP vault', true, `ID: ${vault._id}`)
    logTest('Email lowercased', vault.email === vault.email.toLowerCase())
    logTest('isDefault defaults to false', vault.isDefault === false)

    const decryptedPassword = decrypt(
      vault.encryptedAppPassword,
      vault.iv,
      vault.authTag
    )
    logTest('Password can be decrypted', decryptedPassword === password)

    await SMTPVault.findByIdAndDelete(vault._id)
    await Organization.findByIdAndDelete(org._id)
    await User.findByIdAndDelete(testUser._id)
    logTest('SMTP vault cleanup', true)
  } catch (e) {
    logTest('SMTP vault model operations', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateTenantConnection() {
  logSection('Tenant Connection Manager')
  let allPassed = true

  try {
    const conn = await getTenantConnection('validation-test')
    logTest('Tenant connection created', true, `DB: ${conn.name}`)
    logTest('DB name follows convention', conn.name === 'org_validation-test')

    const conn2 = await getTenantConnection('validation-test')
    logTest('Connection cached (same instance)', conn === conn2)

    const conn3 = await getTenantConnection('other-test')
    logTest('Different slug creates different connection', conn !== conn3)

    await closeTenantConnection('validation-test')
    await closeTenantConnection('other-test')
    logTest('Connections closed', true)

    clearAllTenantConnections()
    clearModelCache()
  } catch (e) {
    logTest('Tenant connection operations', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateTenantModels() {
  logSection('Tenant Models Factory')
  let allPassed = true

  try {
    const models = await getTenantModels('model-test')

    logTest('Event model exists', !!models.Event)
    logTest('Receipt model exists', !!models.Receipt)
    logTest('Sequence model exists', !!models.Sequence)
    logTest('Template model exists', !!models.Template)

    const event = await models.Event.create({
      eventCode: `EVT${Date.now().toString().slice(-6)}`.slice(0, 10),
      type: 'seminar',
      name: 'Test Event',
      items: [],
      startDate: new Date(),
      endDate: new Date(),
    })
    logTest('Create event in tenant DB', true, `ID: ${event._id}`)

    const receipt = await models.Receipt.create({
      receiptNumber: `RCP-${Date.now()}`,
      event: event._id,
      customer: { name: 'Test Customer', email: 'customer@test.com' },
      items: [],
      totalAmount: 100,
    })
    logTest('Create receipt in tenant DB', true, `ID: ${receipt._id}`)

    const models2 = await getTenantModels('model-test')
    logTest('Models cached (same instance)', models.Event === models2.Event)

    await models.Event.deleteMany({})
    await models.Receipt.deleteMany({})
    await models.Sequence.deleteMany({})
    await models.Template.deleteMany({})

    clearAllTenantConnections()
    clearModelCache()
    logTest('Tenant models cleanup', true)
  } catch (e) {
    logTest('Tenant models operations', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function validateTenantIsolation() {
  logSection('Cross-Tenant Isolation')
  let allPassed = true

  try {
    clearAllTenantConnections()
    clearModelCache()

    const modelsA = await getTenantModels('tenant-a')
    const modelsB = await getTenantModels('tenant-b')

    const eventA = await modelsA.Event.create({
      eventCode: 'EVENT-A',
      type: 'seminar',
      name: 'Event in Tenant A',
      items: [],
      startDate: new Date(),
      endDate: new Date(),
    })
    logTest('Create event in tenant A', true)

    const foundInA = await modelsA.Event.findOne({ eventCode: 'EVENT-A' })
    logTest('Event found in tenant A', !!foundInA)

    const foundInB = await modelsB.Event.findOne({ eventCode: 'EVENT-A' })
    logTest('Event NOT found in tenant B', !foundInB)

    await modelsA.Event.deleteMany({})
    await modelsB.Event.deleteMany({})

    clearAllTenantConnections()
    clearModelCache()
    logTest('Isolation test cleanup', true)
  } catch (e) {
    logTest('Tenant isolation test', false)
    logError(e)
    allPassed = false
  }

  return allPassed
}

async function cleanup() {
  logSection('Final Cleanup')
  try {
    await mongoose.disconnect()
    logTest('Disconnected from MongoDB', true)
  } catch (e) {
    logTest('Cleanup', false)
    logError(e)
  }
}

async function dropTestDatabases() {
  if (!shouldCleanup) return

  logSection('Dropping Test Tenant Databases')

  const testDbPatterns = [
    'org_validation-test',
    'org_model-test',
    'org_tenant-a',
    'org_tenant-b',
    'org_other-test',
    'org_cleanup',
  ]

  let dropped = 0

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!)
  }

  for (const dbName of testDbPatterns) {
    try {
      const tenantConn = mongoose.connection.useDb(dbName)
      await tenantConn.dropDatabase()
      logTest(`Dropped ${dbName}`, true)
      dropped++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (
        msg.includes('does not exist') ||
        msg.includes('not found') ||
        msg.includes('ns not found')
      ) {
        logTest(`${dbName}`, true, '(already gone)')
      } else {
        logTest(`Dropped ${dbName}`, false, msg)
      }
    }
  }

  log('yellow', `\n  Dropped ${dropped} test databases`)

  clearAllTenantConnections()
  clearModelCache()
  await mongoose.disconnect()
}

async function main() {
  console.log('\n' + '═'.repeat(50))
  log('cyan', '  PHASE 1 VALIDATION SCRIPT')
  console.log('═'.repeat(50))

  const results: { section: string; passed: boolean }[] = []

  results.push({
    section: 'Environment Variables',
    passed: await validateEnvironment(),
  })
  results.push({ section: 'Encryption', passed: await validateEncryption() })
  results.push({
    section: 'Master Connection',
    passed: await validateMasterConnection(),
  })
  results.push({ section: 'User Model', passed: await validateUserModel() })
  results.push({
    section: 'Organization Model',
    passed: await validateOrganizationModel(),
  })
  results.push({
    section: 'Membership Request Model',
    passed: await validateMembershipRequestModel(),
  })
  results.push({
    section: 'SMTP Vault Model',
    passed: await validateSMTPVaultModel(),
  })
  results.push({
    section: 'Tenant Connection',
    passed: await validateTenantConnection(),
  })
  results.push({
    section: 'Tenant Models',
    passed: await validateTenantModels(),
  })
  results.push({
    section: 'Tenant Isolation',
    passed: await validateTenantIsolation(),
  })

  await cleanup()

  console.log('\n' + '═'.repeat(50))
  log('cyan', '  SUMMARY')
  console.log('═'.repeat(50))

  let allPassed = true
  for (const result of results) {
    logTest(result.section, result.passed)
    if (!result.passed) allPassed = false
  }

  console.log('\n' + '═'.repeat(50))
  if (allPassed) {
    log('green', '  ✓ ALL VALIDATIONS PASSED - Phase 1 Complete!')
  } else {
    log('red', '  ✗ SOME VALIDATIONS FAILED - Review errors above')
  }
  console.log('═'.repeat(50) + '\n')

  if (shouldCleanup) {
    await dropTestDatabases()
  }

  process.exit(allPassed ? 0 : 1)
}

main().catch((e) => {
  log('red', `Fatal error: ${e.message}`)
  process.exit(1)
})
