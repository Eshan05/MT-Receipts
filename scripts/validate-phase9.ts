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

function readSafe(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8')
}

async function validatePhase9Files() {
  logSection('Phase 9 Files')
  let allPassed = true

  const files = [
    { path: 'lib/limits.ts', desc: 'Limits helper' },
    { path: 'lib/quota-enforcement.ts', desc: 'Quota enforcement helper' },
    { path: 'app/api/usages/route.ts', desc: 'Usage API route' },
    {
      path: 'app/(tenant)/[slug]/dashboard/page.tsx',
      desc: 'Tenant admin dashboard page',
    },
    {
      path: 'scripts/validate-phase9.ts',
      desc: 'Phase 9 validator script',
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

async function validateRouteWiring() {
  logSection('Quota Enforcement Wiring')
  let allPassed = true

  const eventsRoute = readSafe('app/api/events/route.ts')
  const receiptsRoute = readSafe('app/api/receipts/route.ts')
  const invitesRoute = readSafe('app/api/invites/route.ts')
  const membershipsRoute = readSafe('app/api/memberships/route.ts')
  const orgRoot = readSafe('app/(tenant)/[slug]/page.tsx')

  const eventsWired =
    eventsRoute.includes("from '@/lib/quota-enforcement'") &&
    eventsRoute.includes('enforceMaxEvents')
  logTest('Events POST enforces maxEvents', eventsWired)
  if (!eventsWired) allPassed = false

  const receiptsWired =
    receiptsRoute.includes("from '@/lib/quota-enforcement'") &&
    receiptsRoute.includes('enforceMaxReceipts')
  logTest('Receipts POST enforces maxReceiptsPerMonth', receiptsWired)
  if (!receiptsWired) allPassed = false

  const invitesWired =
    invitesRoute.includes('enforceMaxUsersForInvite') &&
    invitesRoute.includes('slotsToReserve')
  logTest('Invites POST enforces maxUsers', invitesWired)
  if (!invitesWired) allPassed = false

  const membershipsWired = membershipsRoute.includes('enforceMaxUsersForJoin')
  logTest('Membership join enforces maxUsers', membershipsWired)
  if (!membershipsWired) allPassed = false

  const rootRedirectsToDashboard = orgRoot.includes(
    'redirect(`/${slug}/dashboard`)'
  )
  logTest('Tenant root redirects to /dashboard', rootRedirectsToDashboard)
  if (!rootRedirectsToDashboard) allPassed = false

  return allPassed
}

async function validateUsageApi() {
  logSection('Usage API')
  let allPassed = true

  const usageRoute = readSafe('app/api/usages/route.ts')

  const isAdminOnly = usageRoute.includes('requireAdmin')
  logTest('Usage API is admin-only', isAdminOnly)
  if (!isAdminOnly) allPassed = false

  const includesUsageSnapshot = usageRoute.includes('getUsageSnapshot')
  logTest('Usage API returns computed usage snapshot', includesUsageSnapshot)
  if (!includesUsageSnapshot) allPassed = false

  return allPassed
}

async function validateManualChecks() {
  logSection('Manual Validation Checklist')
  log('yellow', '  ℹ Please manually verify:')
  console.log('      1. Set org limits in Super Admin (e.g. maxEvents=1)')
  console.log('      2. Try creating a second event → should be blocked')
  console.log('      3. Try creating receipts past limit → should be blocked')
  console.log('      4. Try inviting users past maxUsers → should be blocked')
  console.log('      5. Visit /{slug}/dashboard as admin → see usage counts')
  return true
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 9: Limits & Enforcement Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validatePhase9Files())) allPassed = false
  if (!(await validateRouteWiring())) allPassed = false
  if (!(await validateUsageApi())) allPassed = false
  if (!(await validateManualChecks())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 9 validation PASSED')
  } else {
    log('red', '  ✗ Phase 9 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
