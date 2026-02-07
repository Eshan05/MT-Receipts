import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import type { RateLimitPolicy } from '@/lib/tenants/rate-limits'

export interface RateLimitResult {
  success: boolean
  disabled: boolean
  policy: RateLimitPolicy
  key: string
  limit: number
  remaining: number
  resetAt: number // epoch seconds
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function buildKey(
  policyName: string,
  scope: string,
  windowStart: number
): string {
  // windowStart is included to make fixed-window behavior explicit
  return `rl:${policyName}:${scope}:${windowStart}`
}

export async function checkRateLimit(params: {
  policy: RateLimitPolicy
  scope: string
}): Promise<RateLimitResult> {
  const client = getRedis()
  const now = nowSeconds()

  const { policy, scope } = params

  if (!client) {
    return {
      success: true,
      disabled: true,
      policy,
      key: 'rl:disabled',
      limit: policy.limit,
      remaining: policy.limit,
      resetAt: now + policy.windowSeconds,
    }
  }

  const windowStart =
    Math.floor(now / policy.windowSeconds) * policy.windowSeconds
  const key = buildKey(policy.name, scope, windowStart)

  const count = await client.incr(key)
  if (count === 1) {
    // give a small buffer to avoid edge expiry during read
    await client.expire(key, policy.windowSeconds + 5)
  }

  const resetAt = windowStart + policy.windowSeconds
  const remaining = Math.max(0, policy.limit - count)
  const success = count <= policy.limit

  return {
    success,
    disabled: false,
    policy,
    key,
    limit: policy.limit,
    remaining,
    resetAt,
  }
}

export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', String(result.limit))
  headers.set('X-RateLimit-Remaining', String(result.remaining))
  headers.set('X-RateLimit-Reset', String(result.resetAt))

  if (!result.success) {
    const retryAfterSeconds = Math.max(0, result.resetAt - nowSeconds())
    headers.set('Retry-After', String(retryAfterSeconds))
  }

  return headers
}

export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  const headers = rateLimitHeaders(result)
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      limiter: result.policy.name,
      resetAt: result.resetAt,
    },
    { status: 429, headers }
  )
}
