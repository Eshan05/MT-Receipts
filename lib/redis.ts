import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

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
  const key = `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
  const cached = await redis.get<CachedOrganization>(key)
  return cached
}

export async function setCachedOrganization(
  slug: string,
  data: CachedOrganization
): Promise<void> {
  const key = `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
  await redis.setex(key, ORG_CACHE_TTL, JSON.stringify(data))
}

export async function invalidateCachedOrganization(
  slug: string
): Promise<void> {
  const key = `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
  await redis.del(key)
}

export async function getCacheKey(slug: string): Promise<string> {
  return `${ORG_CACHE_PREFIX}${slug.toLowerCase()}`
}
