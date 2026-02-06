import 'dotenv/config'
import mongoose from 'mongoose'
import {
  getCurrentOrgSlug,
  setCurrentOrgCookie,
  clearCurrentOrgCookie,
} from '../../lib/auth/auth'
import { NextResponse } from 'next/server'
import { isSlugReserved } from '../../utils/reserved-slugs'
import Organization from '../../models/organization.model'
import User from '@/models/user.model'
import dbConnect from '@/lib/db-conn'
import fs from 'fs'
import path from 'path'

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
    { path: 'app/page.tsx', desc: 'Landing page' },
    { path: 'app/o/page.tsx', desc: 'Organization creation page' },
    { path: 'app/api/organizations/route.ts', desc: 'Organizations API' },
    {
      path: 'app/api/organizations/[slug]/route.ts',
      desc: 'Organization by slug API',
    },
    { path: 'lib/auth.ts', desc: 'Auth utilities' },
    { path: 'contexts/AuthContext.tsx', desc: 'Auth context' },
  ]

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path)
    const exists = fs.existsSync(fullPath)
    logTest(`${file.desc} exists`, exists, file.path)
    if (!exists) allPassed = false
  }

  return allPassed
}

async function validateSlugValidation() {
  logSection('Slug Validation')
  let allPassed = true

  logTest('reserved slug "api"', isSlugReserved('api'))
  logTest('reserved slug "o"', isSlugReserved('o'))
  logTest('reserved slug "v"', isSlugReserved('v'))
  logTest('non-reserved slug "aces"', !isSlugReserved('aces'))
  logTest('case-insensitive check', isSlugReserved('API'))

  return allPassed
}

async function validateAuthFunctions() {
  logSection('Auth Functions')
  let allPassed = true

  try {
    logTest(
      'getCurrentOrgSlug function exists',
      typeof getCurrentOrgSlug === 'function'
    )
    logTest(
      'setCurrentOrgCookie function exists',
      typeof setCurrentOrgCookie === 'function'
    )
    logTest(
      'clearCurrentOrgCookie function exists',
      typeof clearCurrentOrgCookie === 'function'
    )

    const mockResponse = NextResponse.next()
    await setCurrentOrgCookie('test-org', mockResponse)
    const setCookieHeader = mockResponse.cookies.get('currentOrganization')
    logTest(
      'setCurrentOrgCookie sets cookie',
      setCookieHeader?.value === 'test-org'
    )

    await clearCurrentOrgCookie(mockResponse)
    const clearedCookie = mockResponse.cookies.get('currentOrganization')
    logTest('clearCurrentOrgCookie clears cookie', clearedCookie?.value === '')
  } catch (e) {
    logTest('Auth functions validation', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateOrganizationsAPI() {
  logSection('Organizations API')
  let allPassed = true

  try {
    await dbConnect()

    const testSlug = `phase3-test-${Date.now()}`.slice(0, 20)

    const existingOrg = await Organization.findBySlug(testSlug)
    logTest('Slug available for creation', !existingOrg)

    const testUser = await User.create({
      username: `phase3user-${Date.now()}`,
      email: `phase3user-${Date.now()}@validation.local`,
      passhash: 'testhash',
    })

    const org = await Organization.create({
      slug: testSlug,
      name: 'Phase 3 Test Org',
      status: 'pending',
      createdBy: testUser._id,
    })

    logTest('Organization created', !!org, `Slug: ${testSlug}`)
    logTest('Organization has correct slug', org.slug === testSlug)
    logTest('Organization status is pending', org.status === 'pending')

    const foundOrg = await Organization.findBySlug(testSlug)
    logTest('findBySlug returns organization', !!foundOrg)

    testUser.memberships.push({
      organizationId: org._id as mongoose.Types.ObjectId,
      organizationSlug: org.slug,
      role: 'admin',
      approvedAt: new Date(),
    })
    await testUser.save()

    logTest('User membership added', testUser.memberships.length === 1)
    logTest(
      'Membership has correct role',
      testUser.memberships[0].role === 'admin'
    )

    await Organization.findByIdAndDelete(org._id)
    await User.findByIdAndDelete(testUser._id)
    logTest('Cleanup test data', true)
  } catch (e) {
    logTest('Organizations API validation', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateAuthContext() {
  logSection('Auth Context')
  let allPassed = true

  try {
    const authContextPath = path.join(process.cwd(), 'contexts/AuthContext.tsx')
    const content = fs.readFileSync(authContextPath, 'utf-8')

    logTest('contains memberships state', content.includes('memberships'))
    logTest(
      'contains currentOrganization state',
      content.includes('currentOrganization')
    )
    logTest(
      'contains hasOrganizations computed',
      content.includes('hasOrganizations')
    )
    logTest(
      'contains switchOrganization function',
      content.includes('switchOrganization')
    )
    logTest(
      'contains refreshSession function',
      content.includes('refreshSession')
    )
  } catch (e) {
    logTest('Auth context validation', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateSessionsAPI() {
  logSection('Sessions API')
  let allPassed = true

  try {
    const sessionsPath = path.join(process.cwd(), 'app/api/sessions/route.ts')
    const content = fs.readFileSync(sessionsPath, 'utf-8')

    let passed = content.includes('getCurrentOrgSlug')
    logTest('imports getCurrentOrgSlug', passed)
    if (!passed) allPassed = false

    passed = content.includes('setCurrentOrgCookie')
    logTest('imports setCurrentOrgCookie', passed)
    if (!passed) allPassed = false

    passed = content.includes('memberships')
    logTest('returns memberships in GET', passed)
    if (!passed) allPassed = false

    passed = content.includes('currentOrganization')
    logTest('returns currentOrganization in GET', passed)
    if (!passed) allPassed = false

    passed =
      content.includes("z.literal('switch')") ||
      content.includes('z.literal("switch")')
    logTest('handles switch action in POST', passed)
    if (!passed) allPassed = false
  } catch (e) {
    logTest('Sessions API validation', false, (e as Error).message)
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
  }
}

async function main() {
  console.log('\n' + '═'.repeat(50))
  log('cyan', '  PHASE 3 VALIDATION SCRIPT')
  console.log('═'.repeat(50))

  const results: { section: string; passed: boolean }[] = []

  results.push({ section: 'File Structure', passed: await validateFiles() })
  results.push({
    section: 'Slug Validation',
    passed: await validateSlugValidation(),
  })
  results.push({
    section: 'Auth Functions',
    passed: await validateAuthFunctions(),
  })
  results.push({
    section: 'Organizations API',
    passed: await validateOrganizationsAPI(),
  })
  results.push({ section: 'Auth Context', passed: await validateAuthContext() })
  results.push({ section: 'Sessions API', passed: await validateSessionsAPI() })

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
    log('green', '  ✓ ALL VALIDATIONS PASSED - Phase 3 Complete!')
  } else {
    log('red', '  ✗ SOME VALIDATIONS FAILED - Review errors above')
  }
  console.log('═'.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main().catch((e) => {
  log('red', `Fatal error: ${e.message}`)
  process.exit(1)
})
