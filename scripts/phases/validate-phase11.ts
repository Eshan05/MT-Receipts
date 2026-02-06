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

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relPath))
}

async function validatePhase11Files() {
  logSection('Phase 11 Files')
  let allPassed = true

  const files = [
    {
      path: '__tests__/tenant/isolation.test.ts',
      desc: 'Cross-tenant isolation tests',
    },
    {
      path: '__tests__/api/superadmin/organizations/[slug]/route.test.ts',
      desc: 'Superadmin organization lifecycle tests',
    },
    {
      path: '__tests__/api/cron/purge-deleted-orgs/route.test.ts',
      desc: 'Purge cron tests (retention hard-delete)',
    },
    {
      path: '__tests__/models/smtp-vault.model.test.ts',
      desc: 'SMTP vault encryption/decryption tests',
    },
    {
      path: 'lib/b2-s3.ts',
      desc: 'Backblaze B2 S3 client helper',
    },
    {
      path: 'scripts/smoke-b2.ts',
      desc: 'Backblaze B2 smoke script',
    },
    {
      path: 'app/api/admins/backups/route.ts',
      desc: 'Superadmin backups API (healthcheck + run backup)',
    },
    {
      path: 'components/navigation/backups-credenza.tsx',
      desc: 'Backups credenza UI (nav-user)',
    },
    {
      path: 'components/navigation/nav-user.tsx',
      desc: 'Nav-user dropdown entry point (Backups menu item)',
    },
  ]

  for (const file of files) {
    const ok = exists(file.path)
    logTest(`${file.desc} exists`, ok, file.path)
    if (!ok) allPassed = false
  }

  return allPassed
}

async function validateManualChecks() {
  logSection('Manual Validation Checklist')
  log('yellow', '  ℹ Please manually verify:')
  console.log('      1. Run: pnpx tsx scripts/smoke-b2.ts')
  console.log('      2. Open any superadmin page (e.g. /s/dashboard)')
  console.log('      3. Open nav-user dropdown → Backups')
  console.log('      4. Click Re-test and confirm it shows Connected')
  console.log('      5. Click Run backup now and confirm upload succeeds')
  return true
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 11: Migration & Testing Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validatePhase11Files())) allPassed = false
  if (!(await validateManualChecks())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 11 validation PASSED')
  } else {
    log('red', '  ✗ Phase 11 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
