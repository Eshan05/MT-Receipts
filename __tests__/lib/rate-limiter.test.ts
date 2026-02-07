import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/redis', () => ({
  getRedis: vi.fn(() => null),
  redis: null,
}))

import { checkRateLimit } from '@/lib/tenants/rate-limiter'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { getRedis } from '@/lib/redis'

describe('rate limiter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getRedis).mockReturnValue(null)
  })

  it('is disabled (allows) when redis not configured', async () => {
    vi.mocked(getRedis).mockReturnValue(null)

    const res = await checkRateLimit({
      policy: RATE_LIMITS.tenantApiRequests,
      scope: 'tenant:abc',
    })

    expect(res.success).toBe(true)
    expect(res.disabled).toBe(true)
    expect(res.remaining).toBe(res.limit)
  })

  it('increments and blocks after limit exceeded', async () => {
    const incr = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)

    const expire = vi.fn().mockResolvedValue(true)

    vi.mocked(getRedis).mockReturnValue({
      incr,
      expire,
    } as any)

    const policy = { name: 't', limit: 2, windowSeconds: 60 }

    const a = await checkRateLimit({ policy, scope: 's' })
    expect(a.success).toBe(true)
    expect(a.remaining).toBe(1)

    const b = await checkRateLimit({ policy, scope: 's' })
    expect(b.success).toBe(true)
    expect(b.remaining).toBe(0)

    const c = await checkRateLimit({ policy, scope: 's' })
    expect(c.success).toBe(false)
    expect(c.remaining).toBe(0)

    expect(expire).toHaveBeenCalledTimes(1)
  })
})
