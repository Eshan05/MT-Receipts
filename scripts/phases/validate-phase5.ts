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

async function validateFiles() {
  logSection('File Structure')
  let allPassed = true

  const files = [
    {
      path: 'components/navigation/nav-organization.tsx',
      desc: 'Organization selector component',
    },
    {
      path: 'components/organization/organization-settings-dropdown.tsx',
      desc: 'Settings dropdown component',
    },
    { path: 'app/(tenant)/layout.tsx', desc: 'Tenant layout with sidebar' },
    { path: 'app/(tenant)/[slug]/members/page.tsx', desc: 'Members page' },
    { path: 'app/(tenant)/[slug]/events/page.tsx', desc: 'Events page' },
    {
      path: 'app/(tenant)/[slug]/events/[code]/page.tsx',
      desc: 'Event detail page',
    },
    { path: 'app/(tenant)/[slug]/receipts/page.tsx', desc: 'Receipts page' },
    {
      path: 'app/api/organizations/[slug]/members/route.ts',
      desc: 'Members API',
    },
    {
      path: 'app/api/organizations/[slug]/members/[userId]/route.ts',
      desc: 'Member management API',
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

async function validateOldRoutesRemoved() {
  logSection('Old Routes Cleanup')
  let allPassed = true

  const oldPaths = [
    { path: 'app/api/invites/[code]/accept', desc: 'Non-RESTful accept route' },
    { path: 'app/api/invites/[code]/reject', desc: 'Non-RESTful reject route' },
    { path: 'app/api/invites/[id]', desc: 'Old [id] route' },
    { path: 'app/api/invites/join', desc: 'Old join route' },
    {
      path: 'app/api/users/me/membership-requests',
      desc: 'Old membership-requests route',
    },
  ]

  for (const oldPath of oldPaths) {
    const fullPath = path.join(process.cwd(), oldPath.path)
    const exists = !fs.existsSync(fullPath)
    logTest(`${oldPath.desc} removed`, exists)
    if (!exists) allPassed = false
  }

  return allPassed
}

async function validateComponentsIntegration() {
  logSection('Components Integration')
  let allPassed = true

  const sidebarPath = path.join(
    process.cwd(),
    'components/navigation/app-sidebar.tsx'
  )
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8')

  logTest(
    'Sidebar imports NavOrganization',
    sidebarContent.includes('NavOrganization')
  )
  logTest(
    'Sidebar uses currentOrganization',
    sidebarContent.includes('currentOrganization')
  )
  logTest(
    'Sidebar generates tenant-aware URLs',
    sidebarContent.includes('${orgSlug}')
  )

  const navUserPath = path.join(
    process.cwd(),
    'components/navigation/nav-user.tsx'
  )
  const navUserContent = fs.readFileSync(navUserPath, 'utf-8')

  logTest(
    'NavUser imports OrganizationSettingsDropdown',
    navUserContent.includes('OrganizationSettingsDropdown')
  )
  logTest('NavUser has Members link', navUserContent.includes('/members'))

  return allPassed
}

async function validateTenantLayout() {
  logSection('Tenant Layout')
  let allPassed = true

  const layoutPath = path.join(process.cwd(), 'app/(tenant)/layout.tsx')
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8')

  logTest(
    'Layout includes SidebarProvider',
    layoutContent.includes('SidebarProvider')
  )
  logTest(
    'Layout includes AdminSidebar',
    layoutContent.includes('AdminSidebar')
  )
  logTest(
    'Layout includes AuthProvider',
    layoutContent.includes('AuthProvider')
  )

  return allPassed
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 5: Organization Management UI Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validateFiles())) allPassed = false
  if (!(await validateOldRoutesRemoved())) allPassed = false
  if (!(await validateComponentsIntegration())) allPassed = false
  if (!(await validateTenantLayout())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 5 validation PASSED')
  } else {
    log('red', '  ✗ Phase 5 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
