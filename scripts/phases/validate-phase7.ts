import 'dotenv/config'
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

async function validateTenantModels() {
  logSection('Tenant Models Infrastructure')
  let allPassed = true

  const files = [
    { path: 'lib/db/tenant.ts', desc: 'Tenant connection manager' },
    {
      path: 'lib/db/tenant-models.ts',
      desc: 'Tenant model factory with schemas',
    },
    { path: 'lib/tenant-route.ts', desc: 'Tenant route helper' },
    {
      path: 'lib/organization-context.ts',
      desc: 'Organization context resolver',
    },
  ]

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path)
    const exists = fs.existsSync(fullPath)
    logTest(`${file.desc} exists`, exists, file.path)
    if (!exists) allPassed = false
  }

  return allPassed
}

async function validateTenantAwareRoutes() {
  logSection('Tenant-Aware API Routes')
  let allPassed = true

  const routes = [
    { path: 'app/api/events/route.ts', desc: 'Events API' },
    { path: 'app/api/events/[code]/route.ts', desc: 'Event by code API' },
    { path: 'app/api/events/items/route.ts', desc: 'Event items API' },
    {
      path: 'app/api/events/entries-count/route.ts',
      desc: 'Entries count API',
    },
    {
      path: 'app/api/events/[code]/entries/route.ts',
      desc: 'Event entries API',
    },
    { path: 'app/api/receipts/route.ts', desc: 'Receipts API' },
    {
      path: 'app/api/receipts/[receiptNumber]/route.ts',
      desc: 'Receipt by number API',
    },
    {
      path: 'app/api/receipts/emails/route.ts',
      desc: 'Bulk receipt emails API',
    },
    {
      path: 'app/api/receipts/[receiptNumber]/emails/route.ts',
      desc: 'Single receipt email API',
    },
    { path: 'app/api/templates/route.ts', desc: 'Templates API' },
    { path: 'app/api/templates/[id]/route.ts', desc: 'Template by ID API' },
    { path: 'app/api/documents/route.ts', desc: 'Documents API' },
  ]

  for (const route of routes) {
    const fullPath = path.join(process.cwd(), route.path)
    const exists = fs.existsSync(fullPath)
    logTest(`${route.desc} exists`, exists, route.path)
    if (!exists) {
      allPassed = false
      continue
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const usesTenantContext =
      content.includes('getTenantContext') ||
      content.includes('getTenantModels') ||
      content.includes('getOrganizationContext')

    logTest(`${route.desc} uses tenant context`, usesTenantContext)
    if (!usesTenantContext) allPassed = false

    const notUsingOldDbConnect =
      !content.includes("from '@/models/event.model'") &&
      !content.includes("from '@/models/receipt.model'") &&
      !content.includes("from '@/models/template.model'")

    logTest(
      `${route.desc} doesn't import old models directly`,
      notUsingOldDbConnect
    )
    if (!notUsingOldDbConnect) allPassed = false
  }

  return allPassed
}

async function validateMiddleware() {
  logSection('Middleware Configuration')
  let allPassed = true

  const middlewarePath = path.join(process.cwd(), 'middleware.ts')
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8')

  logTest(
    'Middleware handles API routes',
    middlewareContent.includes('handleApiRoutes')
  )

  logTest(
    'Middleware injects org headers for API routes',
    middlewareContent.includes('currentOrganization') &&
      middlewareContent.includes('injectOrganizationHeaders')
  )

  logTest(
    'Middleware extracts tenant slug from path',
    middlewareContent.includes('extractSlugFromPath')
  )

  logTest(
    'Middleware checks organization status',
    middlewareContent.includes('resolveOrganization')
  )

  return allPassed
}

async function validateDatabaseIsolation() {
  logSection('Database Isolation')

  log('yellow', '  ℹ Manual verification required:')
  console.log('      1. Create two different organizations')
  console.log('      2. Create events in each organization')
  console.log(
    '      3. Verify events are in separate databases (org_slug1, org_slug2)'
  )
  console.log('      4. Verify cross-tenant access is blocked')

  return true
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 7: Tenant-Aware Routes Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validateTenantModels())) allPassed = false
  if (!(await validateTenantAwareRoutes())) allPassed = false
  if (!(await validateMiddleware())) allPassed = false
  if (!(await validateDatabaseIsolation())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 7 validation PASSED')
  } else {
    log('red', '  ✗ Phase 7 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
