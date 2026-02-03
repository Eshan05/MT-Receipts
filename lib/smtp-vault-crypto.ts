import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getVaultSecret(): string {
  const secret = process.env.SMTP_VAULT_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('SMTP_VAULT_SECRET (or JWT_SECRET) is required')
  }
  return secret
}

function getVaultKey(): Buffer {
  return crypto.createHash('sha256').update(getVaultSecret()).digest()
}

export interface EncryptedPasswordResult {
  encryptedData: string
  iv: string
  authTag: string
}

export function encryptSmtpAppPassword(
  plainText: string
): EncryptedPasswordResult {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getVaultKey(), iv)

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return {
    encryptedData: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decryptSmtpAppPassword(
  encryptedData: string,
  iv: string,
  authTag: string
): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getVaultKey(),
    Buffer.from(iv, 'base64')
  )

  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

export function encryptSmtpAppPasswordCombined(plainText: string): string {
  const { encryptedData, iv, authTag } = encryptSmtpAppPassword(plainText)
  return `${iv}.${authTag}.${encryptedData}`
}

export function decryptSmtpAppPasswordCombined(payload: string): string {
  const [ivB64, authTagB64, encryptedB64] = payload.split('.')

  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error('Invalid encrypted SMTP password payload')
  }

  return decryptSmtpAppPassword(encryptedB64, ivB64, authTagB64)
}
