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

async function validateSuperadminInfrastructure() {
  logSection('Superadmin Infrastructure')
  let allPassed = true

  const files = [
    { path: 'lib/superadmin-route.ts', desc: 'Superadmin auth helper' },
    {
      path: 'components/navigation/superadmin-sidebar.tsx',
      desc: 'Superadmin sidebar',
    },
    { path: 'app/(superadmin)/layout.tsx', desc: 'Superadmin layout' },
    {
      path: 'app/(superadmin)/s/dashboard/page.tsx',
      desc: 'Superadmin dashboard page',
    },
    {
      path: 'app/(superadmin)/s/organizations/page.tsx',
      desc: 'Superadmin organizations page',
    },
    {
      path: 'app/(superadmin)/s/users/page.tsx',
      desc: 'Superadmin users page',
    },
  ]

  for (const file of files) {
    const exists = fs.existsSync(path.join(process.cwd(), file.path))
    logTest(`${file.desc} exists`, exists, file.path)
    if (!exists) allPassed = false
  }

  return allPassed
}

async function validateSuperadminApis() {
  logSection('Superadmin APIs')
  let allPassed = true

  const routes = [
    {
      path: 'app/api/admins/organizations/route.ts',
      desc: 'Organizations list API',
    },
    {
      path: 'app/api/admins/organizations/[slug]/route.ts',
      desc: 'Organization detail/action API',
    },
    { path: 'app/api/admins/users/route.ts', desc: 'Users list API' },
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
    const hasSuperAdminGuard = content.includes('getSuperAdminContext')
    logTest(`${route.desc} enforces superadmin guard`, hasSuperAdminGuard)
    if (!hasSuperAdminGuard) allPassed = false
  }

  return allPassed
}

async function validateNavConsistency() {
  logSection('Navigation Consistency')
  let allPassed = true

  const navUserContent = fs.readFileSync(
    path.join(process.cwd(), 'components/navigation/nav-user.tsx'),
    'utf-8'
  )

  const supportsModes =
    navUserContent.includes("mode?: 'tenant' | 'superadmin'") &&
    navUserContent.includes("mode = 'tenant'")

  logTest('Nav user supports tenant/superadmin variants', supportsModes)
  if (!supportsModes) allPassed = false

  const middlewareHelpers = fs.readFileSync(
    path.join(process.cwd(), 'lib/middleware-helpers.ts'),
    'utf-8'
  )
  const hasCorrectApiPrefix = middlewareHelpers.includes("'/api/admins'")

  logTest('Middleware helper includes /api/admins path', hasCorrectApiPrefix)
  if (!hasCorrectApiPrefix) allPassed = false

  return allPassed
}

async function validateManualChecks() {
  logSection('Manual Validation Checklist')
  log('yellow', '  ℹ Please manually verify:')
  console.log('      1. Login as superadmin and visit /s/dashboard')
  console.log('      2. Confirm sidebar and nav-user differ from tenant UI')
  console.log(
    '      3. Approve/suspend/restore/delete org from organizations page'
  )
  console.log(
    '      4. Verify users page shows memberships and superadmin badges'
  )
  console.log(
    '      5. Confirm non-superadmin users are blocked from /s and /api/admins/*'
  )
  return true
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 6: Superadmin Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validateSuperadminInfrastructure())) allPassed = false
  if (!(await validateSuperadminApis())) allPassed = false
  if (!(await validateNavConsistency())) allPassed = false
  if (!(await validateManualChecks())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 6 validation PASSED')
  } else {
    log('red', '  ✗ Phase 6 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
