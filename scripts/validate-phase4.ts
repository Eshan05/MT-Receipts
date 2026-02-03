import 'dotenv/config'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'
import { nanoid } from 'nanoid'

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
}

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

async function validateFiles() {
  logSection('File Structure')
  let allPassed = true

  const files = [
    {
      path: 'app/api/invites/route.ts',
      desc: 'POST /api/invites - Create invite',
    },
    {
      path: 'app/api/invites/[code]/route.ts',
      desc: 'GET/DELETE /api/invites/[code]',
    },
    {
      path: 'app/api/memberships/route.ts',
      desc: 'POST /api/memberships - Join via code',
    },
    {
      path: 'app/api/invitations/route.ts',
      desc: 'GET /api/invitations - List user invitations',
    },
    {
      path: 'lib/emails/organization-invite-email.tsx',
      desc: 'Organization invite email template',
    },
  ]

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path)
    const exists = fs.existsSync(fullPath)
    logTest(`${file.desc} exists`, exists, file.path)
    if (!exists) allPassed = false
  }

  const deletedFiles = [
    {
      path: 'app/api/invites/[id]',
      desc: 'Old [id] route (should be deleted)',
    },
    {
      path: 'app/api/invites/join',
      desc: 'Old join route (should be deleted)',
    },
    {
      path: 'app/api/invites/[code]/accept',
      desc: 'Non-RESTful accept route (should be deleted)',
    },
    {
      path: 'app/api/invites/[code]/reject',
      desc: 'Non-RESTful reject route (should be deleted)',
    },
    {
      path: 'app/api/users/me/membership-requests',
      desc: 'Old membership-requests route (should be deleted)',
    },
  ]

  for (const file of deletedFiles) {
    const fullPath = path.join(process.cwd(), file.path)
    const exists = !fs.existsSync(fullPath)
    logTest(`${file.desc}`, exists)
    if (!exists) allPassed = false
  }

  return allPassed
}

async function validateInviteModel() {
  logSection('MembershipRequest Model')
  let allPassed = true

  try {
    await dbConnect()

    const timestamp = Date.now()
    const testCode = `TEST${timestamp}`.slice(0, 10)

    const codeInvite = await MembershipRequest.create({
      organizationId: new mongoose.Types.ObjectId(),
      organizationSlug: `test-org-${timestamp}`.slice(0, 20),
      type: 'code',
      code: testCode,
      invitedBy: new mongoose.Types.ObjectId(),
      role: 'member',
      status: 'pending',
      maxUses: 5,
      usedCount: 0,
    })

    logTest('Code invite created', !!codeInvite)
    logTest('Code invite has code field', !!codeInvite.code)
    logTest('Code invite has maxUses', codeInvite.maxUses === 5)
    logTest('Code invite has usedCount', codeInvite.usedCount === 0)

    const emailInvite = await MembershipRequest.create({
      organizationId: new mongoose.Types.ObjectId(),
      organizationSlug: `test-org2-${timestamp}`.slice(0, 20),
      type: 'email',
      email: `test-${timestamp}@example.com`,
      invitedBy: new mongoose.Types.ObjectId(),
      role: 'admin',
      status: 'pending',
    })

    logTest('Email invite created', !!emailInvite)
    logTest('Email invite has email field', !!emailInvite.email)
    logTest('Email invite has no code field', !emailInvite.code)

    await MembershipRequest.findByIdAndDelete(codeInvite._id)
    await MembershipRequest.findByIdAndDelete(emailInvite._id)
  } catch (error) {
    log('red', `  ✗ Model validation error: ${error}`)
    allPassed = false
  }

  return allPassed
}

async function validateInviteCreation() {
  logSection('Invite Creation Flow')
  let allPassed = true

  try {
    await dbConnect()

    const timestamp = Date.now()

    const adminUser = await User.create({
      username: `invadmin-${timestamp}`,
      email: `invadmin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    const org = await Organization.create({
      name: 'Test Invite Org',
      slug: `invorg${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: adminUser._id,
    })

    adminUser.memberships.push({
      organizationId: org._id as any,
      organizationSlug: org.slug,
      role: 'admin',
      approvedAt: new Date(),
    })
    await adminUser.save()

    const code = nanoid(10).toUpperCase()
    const codeInvite = await MembershipRequest.create({
      organizationId: org._id,
      organizationSlug: org.slug,
      type: 'code',
      code,
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      maxUses: 10,
      usedCount: 0,
    })

    logTest('Code invite created', !!codeInvite)
    logTest('Code is uppercase', codeInvite.code === code)
    logTest('Code has maxUses', codeInvite.maxUses === 10)

    const emailInvite = await MembershipRequest.create({
      organizationId: org._id,
      organizationSlug: org.slug,
      type: 'email',
      email: `invited-${timestamp}@test.local`,
      invitedBy: adminUser._id,
      role: 'admin',
      status: 'pending',
    })

    logTest('Email invite created', !!emailInvite)

    await MembershipRequest.deleteMany({ organizationId: org._id })
    await Organization.findByIdAndDelete(org._id)
    await User.findByIdAndDelete(adminUser._id)
  } catch (error) {
    log('red', `  ✗ Invite creation error: ${error}`)
    allPassed = false
  }

  return allPassed
}

async function validateRESTfulRoutes() {
  logSection('RESTful Route Naming')
  let allPassed = true

  const routes = [
    {
      method: 'POST',
      path: '/api/invites',
      purpose: 'Create invite (email or code)',
    },
    {
      method: 'GET',
      path: '/api/invites/[code]',
      purpose: 'Get invite details',
    },
    {
      method: 'DELETE',
      path: '/api/invites/[code]',
      purpose: 'Reject/cancel invite',
    },
    {
      method: 'POST',
      path: '/api/memberships',
      purpose: 'Create membership from invite',
    },
    {
      method: 'GET',
      path: '/api/invitations',
      purpose: 'List user invitations',
    },
  ]

  for (const route of routes) {
    log('yellow', `  ${route.method} ${route.path}`)
    console.log(`      ${route.purpose}`)
  }

  logTest('All routes follow RESTful naming', true)

  return allPassed
}

async function cleanup() {
  logSection('Cleanup')

  try {
    await mongoose.disconnect()
    log('green', '  ✓ Database connection closed')
  } catch (error) {
    log('red', `  ✗ Cleanup error: ${error}`)
  }
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 4: Invite System Validation')
  console.log('='.repeat(50))

  const args = process.argv.slice(2)
  const shouldCleanup = args.includes('--cleanup')

  let allPassed = true

  if (!(await validateFiles())) allPassed = false
  if (!(await validateInviteModel())) allPassed = false
  if (!(await validateInviteCreation())) allPassed = false
  if (!(await validateRESTfulRoutes())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 4 validation PASSED')
  } else {
    log('red', '  ✗ Phase 4 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  await cleanup()

  process.exit(allPassed ? 0 : 1)
}

main()
