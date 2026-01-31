import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  encrypt,
  decrypt,
  validateEncryptionConfig,
  generateSecureToken,
} from '@/lib/encryption'

describe('Encryption Utilities', () => {
  const originalSecret = process.env.SMTP_VAULT_SECRET

  beforeEach(() => {
    vi.stubEnv('SMTP_VAULT_SECRET', 'a'.repeat(32))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    if (originalSecret) {
      process.env.SMTP_VAULT_SECRET = originalSecret
    }
  })

  describe('encrypt', () => {
    it('produces encrypted output different from input', () => {
      const plaintext = 'my-secret-password'
      const result = encrypt(plaintext)

      expect(result.encrypted).toBeDefined()
      expect(result.iv).toBeDefined()
      expect(result.authTag).toBeDefined()
      expect(result.encrypted).not.toBe(plaintext)
    })

    it('produces different ciphertext for same input (random IV)', () => {
      const plaintext = 'same-password'
      const result1 = encrypt(plaintext)
      const result2 = encrypt(plaintext)

      expect(result1.encrypted).not.toBe(result2.encrypted)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it('produces 32-character hex IV', () => {
      const result = encrypt('test')
      expect(result.iv).toMatch(/^[a-f0-9]{32}$/)
    })

    it('produces 32-character hex auth tag', () => {
      const result = encrypt('test')
      expect(result.authTag).toMatch(/^[a-f0-9]{32}$/)
    })
  })

  describe('decrypt', () => {
    it('decrypts to original plaintext', () => {
      const plaintext = 'my-app-password-1234'
      const encrypted = encrypt(plaintext)

      const decrypted = decrypt(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag
      )

      expect(decrypted).toBe(plaintext)
    })

    it('handles various input lengths', () => {
      const inputs = ['a', 'ab', 'abc', 'a'.repeat(100), 'special!@#$%^&*()']

      for (const input of inputs) {
        const encrypted = encrypt(input)
        const decrypted = decrypt(
          encrypted.encrypted,
          encrypted.iv,
          encrypted.authTag
        )
        expect(decrypted).toBe(input)
      }
    })

    it('throws on tampered ciphertext', () => {
      const encrypted = encrypt('secret')

      const tamperedCiphertext = '0'.repeat(encrypted.encrypted.length)

      expect(() =>
        decrypt(tamperedCiphertext, encrypted.iv, encrypted.authTag)
      ).toThrow()
    })

    it('throws on tampered IV', () => {
      const encrypted = encrypt('secret')

      expect(() =>
        decrypt(
          encrypted.encrypted,
          '00000000000000000000000000000000',
          encrypted.authTag
        )
      ).toThrow()
    })

    it('throws on tampered auth tag', () => {
      const encrypted = encrypt('secret')

      expect(() =>
        decrypt(
          encrypted.encrypted,
          encrypted.iv,
          '00000000000000000000000000000000'
        )
      ).toThrow()
    })

    it('throws on wrong auth tag', () => {
      const encrypted1 = encrypt('secret1')
      const encrypted2 = encrypt('secret2')

      expect(() =>
        decrypt(encrypted1.encrypted, encrypted1.iv, encrypted2.authTag)
      ).toThrow()
    })
  })

  describe('validateEncryptionConfig', () => {
    it('returns valid when config is correct', () => {
      const result = validateEncryptionConfig()
      expect(result.valid).toBe(true)
    })

    it('returns error when secret is not set', () => {
      vi.stubEnv('SMTP_VAULT_SECRET', '')

      const result = validateEncryptionConfig()
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not set')
    })

    it('returns error when secret is too short', () => {
      vi.stubEnv('SMTP_VAULT_SECRET', 'short')

      const result = validateEncryptionConfig()
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 32 characters')
    })
  })

  describe('generateSecureToken', () => {
    it('generates token of default length', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[a-f0-9]+$/)
    })

    it('generates token of specified length', () => {
      const token = generateSecureToken(16)
      expect(token).toHaveLength(32)
    })

    it('generates unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken())
      }
      expect(tokens.size).toBe(100)
    })
  })

  describe('encryption stability', () => {
    it('same secret decrypts across instances', () => {
      const plaintext = 'cross-instance-test'
      const encrypted = encrypt(plaintext)

      const decrypted = decrypt(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag
      )

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('security properties', () => {
    it('uses AES-256-GCM algorithm', () => {
      const encrypted = encrypt('test')
      expect(encrypted.authTag).toBeDefined()
      expect(encrypted.authTag).toHaveLength(32)
    })

    it('IV is never reused', () => {
      const ivs = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const encrypted = encrypt('same-input')
        ivs.add(encrypted.iv)
      }
      expect(ivs.size).toBe(100)
    })
  })
})
