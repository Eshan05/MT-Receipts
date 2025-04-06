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

export function encryptSmtpAppPassword(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getVaultKey(), iv)

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`
}

export function decryptSmtpAppPassword(payload: string): string {
  const [ivB64, authTagB64, encryptedB64] = payload.split('.')

  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error('Invalid encrypted SMTP password payload')
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getVaultKey(),
    Buffer.from(ivB64, 'base64')
  )

  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
