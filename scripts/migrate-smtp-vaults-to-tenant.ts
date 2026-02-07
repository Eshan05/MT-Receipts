/*
One-time migration: copy SMTP vault entries from the master DB collection
into each tenant DB (org_<slug>) so vaults are isolated per tenant.

Usage:
  pnpm -s tsx scripts/migrate-smtp-vaults-to-tenant.ts

Optional:
  MIGRATE_SMTP_VAULTS_OVERWRITE=true  # overwrite existing tenant entries
*/

import dbConnect from '@/lib/db-conn'
import SMTPVault from '@/models/smtp-vault.model'
import Organization from '@/models/organization.model'
import { getTenantModels } from '@/lib/db/tenant-models'

async function main() {
  await dbConnect()

  const overwrite =
    String(process.env.MIGRATE_SMTP_VAULTS_OVERWRITE || '').toLowerCase() ===
    'true'

  const vaults = await SMTPVault.find().lean()

  let processed = 0
  let created = 0
  let updated = 0
  let skipped = 0
  let missingOrg = 0
  let errors = 0

  for (const vault of vaults) {
    processed++

    try {
      const orgId = String(vault.organizationId)
      const org = await Organization.findById(orgId).lean()
      if (!org) {
        missingOrg++
        continue
      }

      const tenantSlug = String(org.slug)
      const { SMTPVault: TenantSMTPVault } = await getTenantModels(tenantSlug)

      const existing = await TenantSMTPVault.findOne({
        organizationId: orgId,
        email: String(vault.email).toLowerCase(),
      })

      const payload = {
        organizationId: orgId,
        label: vault.label || undefined,
        email: String(vault.email).toLowerCase(),
        encryptedAppPassword: vault.encryptedAppPassword,
        iv: vault.iv,
        authTag: vault.authTag,
        isDefault: Boolean(vault.isDefault),
        lastUsedAt: vault.lastUsedAt,
        createdBy: vault.createdBy,
      }

      if (!existing) {
        if (payload.isDefault) {
          await TenantSMTPVault.updateMany(
            { organizationId: orgId, isDefault: true },
            { isDefault: false }
          )
        }
        await TenantSMTPVault.create(payload)
        created++
        continue
      }

      if (!overwrite) {
        skipped++
        continue
      }

      if (payload.isDefault) {
        await TenantSMTPVault.updateMany(
          { organizationId: orgId, isDefault: true },
          { isDefault: false }
        )
      }

      existing.label = payload.label
      existing.encryptedAppPassword = payload.encryptedAppPassword
      existing.iv = payload.iv
      existing.authTag = payload.authTag
      existing.isDefault = payload.isDefault
      existing.lastUsedAt = payload.lastUsedAt
      existing.createdBy = payload.createdBy
      await existing.save()
      updated++
    } catch {
      errors++
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        processed,
        created,
        updated,
        skipped,
        missingOrg,
        errors,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
