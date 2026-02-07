/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'

describe('lib/tenants/rate-limits', () => {
  it('defines expected policies with positive limits/windows', () => {
    expect(RATE_LIMITS.tenantApiRequests).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        limit: expect.any(Number),
        windowSeconds: expect.any(Number),
      })
    )

    for (const policy of Object.values(RATE_LIMITS)) {
      expect(policy.limit).toBeGreaterThan(0)
      expect(policy.windowSeconds).toBeGreaterThan(0)
      expect(policy.name.length).toBeGreaterThan(0)
    }
  })
})
