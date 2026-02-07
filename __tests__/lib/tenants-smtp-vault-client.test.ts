/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('lib/tenants/smtp-vault-client', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('fetchSmtpVaults calls endpoint and returns vault list', async () => {
    const { fetchSmtpVaults } = await import('@/lib/tenants/smtp-vault-client')

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vaults: [
          {
            id: 'v1',
            email: 'smtp@example.com',
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    } as any)

    const result = await fetchSmtpVaults()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/smtp-vaults', {
      cache: 'no-store',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('v1')
  })

  it('fetchSmtpVaults throws when response is not ok', async () => {
    const { fetchSmtpVaults } = await import('@/lib/tenants/smtp-vault-client')

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
    } as any)

    await expect(fetchSmtpVaults()).rejects.toThrow(
      'Failed to fetch SMTP vaults'
    )
  })

  it('fetchSmtpVaults returns [] when payload shape is unexpected', async () => {
    const { fetchSmtpVaults } = await import('@/lib/tenants/smtp-vault-client')

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vaults: 'nope' }),
    } as any)

    await expect(fetchSmtpVaults()).resolves.toEqual([])
  })
})
