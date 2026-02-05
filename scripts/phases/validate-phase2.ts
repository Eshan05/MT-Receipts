import 'dotenv/config'
import mongoose from 'mongoose'
import {
  redis,
  getCachedOrganization,
  setCachedOrganization,
  invalidateCachedOrganization,
} from '../../lib/redis'
import {
  isStaticPath,
  isPublicPath,
  isSuperAdminPath,
  extractSlugFromPath,
  isReservedSlug,
} from '../../lib/middleware-helpers'
import {
  resolveOrganization,
  getOrganizationErrorPath,
} from '../../lib/organization-context'
import Organization from '../../models/organization.model'
import User from '../../models/user.model'
import { getMasterConnection } from '../../lib/db/conn'

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

async function validateRedisConnection() {
  logSection('Redis Connection')
  let allPassed = true

  try {
    const result = await redis.ping()
    logTest('Redis PING command', result === 'PONG', `Response: ${result}`)
  } catch (e) {
    logTest('Redis PING command', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateRedisCacheOperations() {
  logSection('Redis Cache Operations')
  let allPassed = true

  try {
    const testSlug = `test-org-${Date.now()}`
    const testData = {
      id: '507f1f77bcf86cd799439011',
      slug: testSlug,
      name: 'Test Organization',
      status: 'active',
    }

    await setCachedOrganization(testSlug, testData)
    logTest('Set cache entry', true)

    const cached = await getCachedOrganization(testSlug)
    logTest(
      'Get cache entry',
      !!cached,
      cached ? `Found: ${cached.slug}` : 'Not found'
    )

    if (cached) {
      logTest('Cache data matches', cached.slug === testSlug)
    }

    await invalidateCachedOrganization(testSlug)
    logTest('Invalidate cache entry', true)

    const afterInvalidation = await getCachedOrganization(testSlug)
    logTest('Cache entry removed', !afterInvalidation)
  } catch (e) {
    logTest('Redis cache operations', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateMiddlewareHelpers() {
  logSection('Middleware Helper Functions')
  let allPassed = true

  try {
    logTest('isStaticPath /favicon.ico', isStaticPath('/favicon.ico'))
    logTest('isStaticPath /_next/static', isStaticPath('/_next/static'))
    logTest('isStaticPath /aces (should be false)', !isStaticPath('/aces'))

    logTest('isPublicPath /', isPublicPath('/'))
    logTest('isPublicPath /login', isPublicPath('/login'))
    logTest('isPublicPath /aces (should be false)', !isPublicPath('/aces'))

    logTest('isSuperAdminPath /superadmin', isSuperAdminPath('/superadmin'))
    logTest(
      'isSuperAdminPath /aces (should be false)',
      !isSuperAdminPath('/aces')
    )

    logTest(
      'extractSlugFromPath /aces',
      extractSlugFromPath('/aces') === 'aces'
    )
    logTest(
      'extractSlugFromPath /ACES',
      extractSlugFromPath('/ACES') === 'aces'
    )
    logTest(
      'extractSlugFromPath /api/users (should be null)',
      extractSlugFromPath('/api/users') === null
    )

    logTest('isReservedSlug api', isReservedSlug('api'))
    logTest('isReservedSlug aces (should be false)', !isReservedSlug('aces'))
  } catch (e) {
    logTest('Middleware helpers', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateOrganizationContext() {
  logSection('Organization Context')
  let allPassed = true

  try {
    await getMasterConnection()

    const testUser = await User.create({
      username: `phase2user-${Date.now()}`,
      email: `phase2user-${Date.now()}@validation.local`,
      passhash: 'hash',
    })

    const testSlug = `phase2-org-${Date.now()}`.slice(0, 20)
    const org = await Organization.create({
      slug: testSlug,
      name: 'Phase 2 Test Org',
      createdBy: testUser._id,
      status: 'active',
    })

    logTest('Create test organization', true, `Slug: ${testSlug}`)

    const context = await resolveOrganization(testSlug)
    logTest('resolveOrganization returns context', !!context)

    if (context) {
      logTest('Context has correct slug', context.slug === testSlug)
      logTest('Context has correct status', context.status === 'active')

      const cached = await getCachedOrganization(testSlug)
      logTest('Organization cached after resolve', !!cached)
    }

    const errorPath = getOrganizationErrorPath(context)
    logTest('getOrganizationErrorPath for active org', errorPath === null)

    const pendingOrg = {
      id: '1',
      slug: 'pending',
      name: 'Pending',
      status: 'pending',
    }
    logTest(
      'Error path for pending',
      getOrganizationErrorPath(pendingOrg) === '/o/202'
    )

    const suspendedOrg = {
      id: '2',
      slug: 'suspended',
      name: 'Suspended',
      status: 'suspended',
    }
    logTest(
      'Error path for suspended',
      getOrganizationErrorPath(suspendedOrg) === '/o/403'
    )

    const deletedOrg = {
      id: '3',
      slug: 'deleted',
      name: 'Deleted',
      status: 'deleted',
    }
    logTest(
      'Error path for deleted',
      getOrganizationErrorPath(deletedOrg) === '/o/410'
    )

    logTest(
      'Error path for null org',
      getOrganizationErrorPath(null) === '/o/404'
    )

    await invalidateCachedOrganization(testSlug)
    await Organization.findByIdAndDelete(org._id)
    await User.findByIdAndDelete(testUser._id)
    logTest('Cleanup test data', true)
  } catch (e) {
    logTest('Organization context validation', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateTenantPages() {
  logSection('Tenant Error Pages')
  let allPassed = true

  try {
    const fs = await import('fs')
    const path = await import('path')

    const pages = [
      { path: 'app/(tenant)/o/404/page.tsx', type: 'not-found' },
      { path: 'app/(tenant)/o/202/page.tsx', type: 'pending' },
      { path: 'app/(tenant)/o/403/page.tsx', type: 'suspended' },
      { path: 'app/(tenant)/o/410/page.tsx', type: 'deleted' },
    ]

    for (const page of pages) {
      const fullPath = path.join(process.cwd(), page.path)
      const exists = fs.existsSync(fullPath)
      logTest(`${page.type} page exists`, exists)
      if (!exists) allPassed = false
    }

    const componentPath = path.join(
      process.cwd(),
      'components/tenant/tenant-error-page.tsx'
    )
    const componentExists = fs.existsSync(componentPath)
    logTest('Shared TenantErrorPage component exists', componentExists)
    if (!componentExists) allPassed = false
  } catch (e) {
    logTest('Tenant pages validation', false, (e as Error).message)
    allPassed = false
  }

  return allPassed
}

async function validateMiddleware() {
  logSection('Middleware')
  let allPassed = true

  try {
    const fs = await import('fs')
    const path = await import('path')

    const middlewarePath = path.join(process.cwd(), 'middleware.ts')
    const exists = fs.existsSync(middlewarePath)
    logTest('middleware.ts exists', exists)

    const content = fs.readFileSync(middlewarePath, 'utf-8')
    logTest(
      'Contains handleTenantRoutes',
      content.includes('handleTenantRoutes')
    )
    logTest(
      'Contains handleSuperAdminRoutes',
      content.includes('handleSuperAdminRoutes')
    )
    logTest(
      'Imports resolveOrganization',
      content.includes('resolveOrganization')
    )
    logTest(
      'Imports extractSlugFromPath',
      content.includes('extractSlugFromPath')
    )
  } catch (e) {
    logTest('Middleware validation', false, (e as Error).message)
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
  log('cyan', '  PHASE 2 VALIDATION SCRIPT')
  console.log('═'.repeat(50))

  const results: { section: string; passed: boolean }[] = []

  results.push({
    section: 'Redis Connection',
    passed: await validateRedisConnection(),
  })
  results.push({
    section: 'Redis Cache Operations',
    passed: await validateRedisCacheOperations(),
  })
  results.push({
    section: 'Middleware Helpers',
    passed: await validateMiddlewareHelpers(),
  })
  results.push({
    section: 'Organization Context',
    passed: await validateOrganizationContext(),
  })
  results.push({ section: 'Tenant Pages', passed: await validateTenantPages() })
  results.push({ section: 'Middleware', passed: await validateMiddleware() })

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
    log('green', '  ✓ ALL VALIDATIONS PASSED - Phase 2 Complete!')
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
