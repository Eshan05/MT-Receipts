import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function getRedis(): Redis | null {
  if (_redis) return _redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  _redis = new Redis({ url, token })
  return _redis
}

// Back-compat export for scripts/tests that import `redis` directly.
// Prefer `getRedis()` so code can gracefully handle missing env vars.
export const redis: Redis | null = getRedis()

export const ORG_CACHE_PREFIX = 'org:'
export const ORG_CACHE_TTL = 300

export interface CachedOrganization {
  id: string
  slug: string
  name: string
  status: string
}

export async function getCachedOrganization(
  slug: string
): Promise<CachedOrganization | null> {
  const client = getRedis()
  if (!client) return null

  const key = `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
  const cached = await client.get<CachedOrganization>(key)
  return cached
}

export async function setCachedOrganization(
  slug: string,
  data: CachedOrganization
): Promise<void> {
  const client = getRedis()
  if (!client) return

  const key = `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
  await client.setex(key, ORG_CACHE_TTL, JSON.stringify(data))
}

export async function invalidateCachedOrganization(
  slug: string
): Promise<void> {
  const client = getRedis()
  if (!client) return

  const key = `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
  await client.del(key)
}

export async function getCacheKey(slug: string): Promise<string> {
  return `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
}
