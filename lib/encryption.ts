import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const secret = process.env.SMTP_VAULT_SECRET
  if (!secret) {
    throw new Error('SMTP_VAULT_SECRET environment variable is not set')
  }

  if (secret.length < 32) {
    throw new Error('SMTP_VAULT_SECRET must be at least 32 characters')
  }

  return crypto.createHash('sha256').update(secret).digest()
}

export interface EncryptedData {
  encrypted: string
  iv: string
  authTag: string
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

export function decrypt(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey()

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  )

  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function validateEncryptionConfig(): { valid: boolean; error?: string } {
  try {
    const secret = process.env.SMTP_VAULT_SECRET
    if (!secret) {
      return { valid: false, error: 'SMTP_VAULT_SECRET is not set' }
    }
    if (secret.length < 32) {
      return {
        valid: false,
        error: 'SMTP_VAULT_SECRET must be at least 32 characters',
      }
    }

    const testData = 'test-encryption-validation'
    const encrypted = encrypt(testData)
    const decrypted = decrypt(
      encrypted.encrypted,
      encrypted.iv,
      encrypted.authTag
    )

    if (decrypted !== testData) {
      return { valid: false, error: 'Encryption/decryption roundtrip failed' }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
