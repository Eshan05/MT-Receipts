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

async function validateBrandingFiles() {
  logSection('Phase 8 Files')
  let allPassed = true

  const files = [
    {
      path: 'lib/organization-branding.ts',
      desc: 'Organization branding helper',
    },
    { path: 'lib/receipt-number.ts', desc: 'Receipt number formatter helper' },
    {
      path: 'components/organization/tenant-theme-sync.tsx',
      desc: 'Tenant theme sync component',
    },
    {
      path: 'lib/pdf/template-renderer.ts',
      desc: 'PDF renderer branding integration',
    },
    {
      path: 'lib/emails/receipt-email.tsx',
      desc: 'Receipt email branding integration',
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

async function validateReceiptFormatting() {
  logSection('Receipt Format Customization')
  let allPassed = true

  const receiptsRoute = readSafe('app/api/receipts/route.ts')
  const formatHelper = readSafe('lib/receipt-number.ts')

  const usesFormatter = receiptsRoute.includes('formatReceiptNumber(')
  logTest('Receipts API uses custom formatter', usesFormatter)
  if (!usesFormatter) allPassed = false

  const supportsRequiredPlaceholders =
    formatHelper.includes("'{eventCode}'") &&
    formatHelper.includes("'{initials}'") &&
    formatHelper.includes("'{seq}'") &&
    formatHelper.includes("'{orgCode}'") &&
    formatHelper.includes("'{year}'") &&
    formatHelper.includes("'{yy}'") &&
    formatHelper.includes("'{month}'") &&
    formatHelper.includes("'{type}'")

  logTest(
    'Formatter supports all Phase 8 placeholders',
    supportsRequiredPlaceholders
  )
  if (!supportsRequiredPlaceholders) allPassed = false

  return allPassed
}

async function validateBrandingPropagation() {
  logSection('Branding Propagation')
  let allPassed = true

  const emailService = readSafe('lib/email.ts')
  const emailTemplate = readSafe('lib/emails/receipt-email.tsx')
  const pdfRenderer = readSafe('lib/pdf/template-renderer.ts')
  const tenantLayout = readSafe('app/(tenant)/layout.tsx')

  const emailReceivesBranding =
    emailService.includes('organizationLogo') &&
    emailService.includes('primaryColor') &&
    emailService.includes('secondaryColor') &&
    emailService.includes('emailFromName') &&
    emailService.includes('emailFromAddress')
  logTest('Email service receives branding metadata', emailReceivesBranding)
  if (!emailReceivesBranding) allPassed = false

  const emailTemplateUsesBranding =
    emailTemplate.includes('organizationLogo') &&
    emailTemplate.includes('primaryColor') &&
    emailTemplate.includes('secondaryColor')
  logTest('Email template uses branding props', emailTemplateUsesBranding)
  if (!emailTemplateUsesBranding) allPassed = false

  const pdfUsesBranding =
    pdfRenderer.includes('getOrganizationBrandingBySlug') &&
    pdfRenderer.includes('orgBranding?.primaryColor')
  logTest(
    'PDF renderer applies org branding defaults/overrides',
    pdfUsesBranding
  )
  if (!pdfUsesBranding) allPassed = false

  const tenantThemeMounted = tenantLayout.includes('TenantThemeSync')
  logTest('Tenant runtime theme sync is mounted in layout', tenantThemeMounted)
  if (!tenantThemeMounted) allPassed = false

  return allPassed
}

async function validateOrgSettingsApi() {
  logSection('Organization Settings API')
  let allPassed = true

  const orgRoute = readSafe('app/api/organizations/[slug]/route.ts')

  const getReturnsSettings = orgRoute.includes(
    'settings: organization.settings'
  )
  logTest('GET /organizations/[slug] returns settings', getReturnsSettings)
  if (!getReturnsSettings) allPassed = false

  const patchRefreshesCache =
    orgRoute.includes('invalidateCachedOrganization') &&
    orgRoute.includes('setCachedOrganization')
  logTest('PATCH refreshes org cache metadata', patchRefreshesCache)
  if (!patchRefreshesCache) allPassed = false

  return allPassed
}

async function validateManualChecks() {
  logSection('Manual Validation Checklist')
  log('yellow', '  ℹ Please manually verify:')
  console.log(
    '      1. Open Organization Settings and change primary/secondary colors'
  )
  console.log(
    '      2. Create a receipt and verify receipt number matches custom format'
  )
  console.log('      3. Download receipt PDF and verify branding is reflected')
  console.log(
    '      4. Send receipt email and verify branding + sender identity'
  )
  console.log(
    '      5. Switch organizations and ensure theme changes per tenant'
  )
  return true
}

async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '  Phase 8: Customization & Branding Validation')
  console.log('='.repeat(50))

  let allPassed = true

  if (!(await validateBrandingFiles())) allPassed = false
  if (!(await validateReceiptFormatting())) allPassed = false
  if (!(await validateBrandingPropagation())) allPassed = false
  if (!(await validateOrgSettingsApi())) allPassed = false
  if (!(await validateManualChecks())) allPassed = false

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    log('green', '  ✓ Phase 8 validation PASSED')
  } else {
    log('red', '  ✗ Phase 8 validation FAILED')
  }
  console.log('='.repeat(50) + '\n')

  process.exit(allPassed ? 0 : 1)
}

main()
