/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('lib/tenants/smtp-vault-crypto', () => {
  const originalVaultSecret = process.env.SMTP_VAULT_SECRET
  const originalJwtSecret = process.env.JWT_SECRET

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.SMTP_VAULT_SECRET = originalVaultSecret
    process.env.JWT_SECRET = originalJwtSecret
  })

  it('encrypts and decrypts SMTP password (roundtrip)', async () => {
    const { encryptSmtpAppPassword, decryptSmtpAppPassword } =
      await import('@/lib/tenants/smtp-vault-crypto')

    const plain = 'app-password-123'
    const encrypted = encryptSmtpAppPassword(plain)

    const decrypted = decryptSmtpAppPassword(
      encrypted.encryptedData,
      encrypted.iv,
      encrypted.authTag
    )

    expect(decrypted).toBe(plain)
  })

  it('encrypts and decrypts combined payload (roundtrip)', async () => {
    const { encryptSmtpAppPasswordCombined, decryptSmtpAppPasswordCombined } =
      await import('@/lib/tenants/smtp-vault-crypto')

    const plain = 'another-password'
    const combined = encryptSmtpAppPasswordCombined(plain)
    const decrypted = decryptSmtpAppPasswordCombined(combined)

    expect(decrypted).toBe(plain)
    expect(combined.split('.')).toHaveLength(3)
  })

  it('decryptSmtpAppPasswordCombined throws on invalid payload', async () => {
    const { decryptSmtpAppPasswordCombined } =
      await import('@/lib/tenants/smtp-vault-crypto')

    expect(() => decryptSmtpAppPasswordCombined('missing.parts')).toThrow(
      'Invalid encrypted SMTP password payload'
    )
  })

  it('throws when secret is missing', async () => {
    process.env.SMTP_VAULT_SECRET = ''
    process.env.JWT_SECRET = ''

    const { encryptSmtpAppPasswordCombined } =
      await import('@/lib/tenants/smtp-vault-crypto')

    expect(() => encryptSmtpAppPasswordCombined('x')).toThrow(
      'SMTP_VAULT_SECRET (or JWT_SECRET) is required'
    )
  })
})
