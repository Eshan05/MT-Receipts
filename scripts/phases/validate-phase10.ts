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
  if (details) console.log(`      ${details}`)
}

function readSafe(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8')
}

async function validatePhase10Files() {
  logSection('Phase 10 Files')
  let allPassed = true

  const files = [
    {
      path: 'app/api/crons/purge-deleted-orgs/route.ts',
      desc: 'Purge deleted orgs cron endpoint',
    },
    {
      path: 'app/api/admins/organizations/[slug]/route.ts',
      desc: 'Superadmin organization lifecycle API',
    },
    {
      path: 'models/organization.model.ts',
      desc: 'Organization model includes deletion fields',
    },
    { path: 'scripts/validate-phase10.ts', desc: 'Phase 10 validator script' },
    {
      path: '__tests__/api/crons/purge-deleted-orgs/route.test.ts',
      desc: 'Purge cron endpoint tests',
    },
  ]

  for (const file of files) {
    const exists = fs.existsSync(path.join(process.cwd(), file.path))
    logTest(`${file.desc} exists`, exists, file.path)
    if (!exists) allPassed = false
  }

  return allPassed
}

async function validateLifecycleApi() {
  logSection('Deletion & Restoration API')
  let allPassed = true

  const orgRoute = readSafe('app/api/admins/organizations/[slug]/route.ts')

  const supportsSoftDelete =
    orgRoute.includes('action: z.enum') &&
    orgRoute.includes("'delete'") &&
    orgRoute.includes('restoresBefore')
  logTest('PATCH supports soft delete (action=delete)', supportsSoftDelete)
  if (!supportsSoftDelete) allPassed = false

  const supportsRestore = orgRoute.includes("case 'restore':")
  logTest('PATCH supports restore (action=restore)', supportsRestore)
  if (!supportsRestore) allPassed = false

  const supportsHardDelete = orgRoute.includes('export async function DELETE')
  logTest('DELETE supports hard delete', supportsHardDelete)
  if (!supportsHardDelete) allPassed = false

  const usesRetentionEnv = orgRoute.includes('ORGANIZATION_RETENTION_DAYS')
  logTest('Soft delete uses ORGANIZATION_RETENTION_DAYS', usesRetentionEnv)
  if (!usesRetentionEnv) allPassed = false

  return allPassed
}

async function validateOrganizationSchema() {
  logSection('Organization Schema')
  let allPassed = true

  const model = readSafe('models/organization.model.ts')

  const hasFields =
    model.includes('deletedAt') && model.includes('restoresBefore')
  logTest('Organization model defines deletedAt/restoresBefore', hasFields)
  if (!hasFields) allPassed = false

  const hasIndex = model.includes('organizationSchema.index({ deletedAt: 1 }')
  logTest('Organization model indexes deletedAt', hasIndex)
  if (!hasIndex) allPassed = false

  return allPassed
}

async function validateCronEndpoint() {
  logSection('Purge Cron Endpoint')
  let allPassed = true

  const cron = readSafe('app/api/crons/purge-deleted-orgs/route.ts')

  const checksSecret =
    cron.includes('CRON_SECRET') && cron.includes('authorization')
  logTest('Cron endpoint checks CRON_SECRET authorization', checksSecret)
  if (!checksSecret) allPassed = false

  const deletesOrgs =
    cron.includes('Organization.deleteOne') ||
    cron.includes('Organization.deleteMany')
  logTest('Cron endpoint deletes organizations', deletesOrgs)
  if (!deletesOrgs) allPassed = false

  const dropsTenantDb = cron.includes('dropDatabase')
  logTest('Cron endpoint drops tenant database', dropsTenantDb)
  if (!dropsTenantDb) allPassed = false

  const usesRetentionEnv = cron.includes('ORGANIZATION_RETENTION_DAYS')
  logTest('Cron endpoint reports ORGANIZATION_RETENTION_DAYS', usesRetentionEnv)
  if (!usesRetentionEnv) allPassed = false

  return allPassed
}

async function validateManualChecks() {
  logSection('Manual Validation Checklist')
  log('yellow', '  ℹ Please manually verify:')
  console.log(
    '      1. Soft delete an org (Super Admin -> Organizations -> Delete)'
  )
  console.log(
    '      2. Confirm deletedAt/restoresBefore are set and org becomes inaccessible'
  )
  console.log('      3. Restore the org (Restore action) within the window')
  console.log(
    '      4. Set ORG retention low and invoke /api/crons/purge-deleted-orgs with Bearer CRON_SECRET'
  )
  console.log('      5. Confirm tenant DB is dropped and org is removed')
  return true
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 10: Deletion & Restoration Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validatePhase10Files())) allPassed = false
  if (!(await validateLifecycleApi())) allPassed = false
  if (!(await validateOrganizationSchema())) allPassed = false
  if (!(await validateCronEndpoint())) allPassed = false
  if (!(await validateManualChecks())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 10 validation PASSED')
  } else {
    log('red', '  ✗ Phase 10 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
