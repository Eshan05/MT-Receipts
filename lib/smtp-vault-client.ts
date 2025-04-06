export interface SmtpVaultMeta {
  id: string
  name?: string
  email: string
  isDefault: boolean
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export async function fetchSmtpVaults(): Promise<SmtpVaultMeta[]> {
  const response = await fetch('/api/smtp-vaults', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch SMTP vaults')
  }

  const data = await response.json()
  return Array.isArray(data.vaults) ? data.vaults : []
}
