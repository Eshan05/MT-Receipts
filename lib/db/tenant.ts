import mongoose from 'mongoose'

const TENANT_DB_PREFIX = process.env.TENANT_DB_PREFIX || 'org_'

const tenantConnections = new Map<string, mongoose.Connection>()

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' }
  }
  if (slug.length > 20) {
    return { valid: false, error: 'Slug must be at most 20 characters' }
  }
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z][a-z0-9]*$/.test(slug)) {
    return {
      valid: false,
      error:
        'Slug must start with a letter, contain only lowercase letters, numbers, and hyphens, and end with a letter or number',
    }
  }
  return { valid: true }
}

export function getTenantDbName(slug: string): string {
  return `${TENANT_DB_PREFIX}${slug}`
}

export async function getTenantConnection(
  slug: string
): Promise<mongoose.Connection> {
  const validation = validateSlug(slug)
  if (!validation.valid) {
    throw new Error(`Invalid slug: ${validation.error}`)
  }

  const dbName = getTenantDbName(slug)

  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName)!
  }

  if (mongoose.connection.readyState === 0) {
    throw new Error('Mongoose not connected. Call getMasterConnection first.')
  }

  const tenantConn = mongoose.connection.useDb(dbName, { useCache: true })
  tenantConnections.set(dbName, tenantConn)

  return tenantConn
}

export function closeTenantConnection(slug: string): Promise<void> {
  const dbName = getTenantDbName(slug)
  const conn = tenantConnections.get(dbName)

  if (conn) {
    tenantConnections.delete(dbName)
    return Promise.resolve()
  }

  return Promise.resolve()
}

export function getActiveTenantConnections(): string[] {
  return Array.from(tenantConnections.keys())
}

export function clearAllTenantConnections(): void {
  tenantConnections.clear()
}
