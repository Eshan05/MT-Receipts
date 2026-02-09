import { describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = process.env

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

describe('qstash config', () => {
  it('disables QStash for loopback app URL when not using local QStash dev server', async () => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }

    setEnv({
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      QSTASH_URL: undefined,
      QSTASH_TOKEN: 'token',
      QSTASH_CURRENT_SIGNING_KEY: 'sig_current',
    })

    const mod = await import('@/lib/queue/qstash')
    expect(mod.isQstashConfigured()).toBe(false)
    expect(() => mod.getAbsoluteJobUrl('/api/jobs/example')).toThrow(
      /loopback/i
    )
  })

  it('enables QStash for loopback app URL when using QStash local dev server', async () => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }

    setEnv({
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      QSTASH_URL: 'http://localhost:8080',
      QSTASH_TOKEN: 'token',
      QSTASH_CURRENT_SIGNING_KEY: 'sig_current',
    })

    const mod = await import('@/lib/queue/qstash')
    expect(mod.isQstashConfigured()).toBe(true)
    expect(mod.getAbsoluteJobUrl('/api/jobs/example')).toBe(
      'http://localhost:3000/api/jobs/example'
    )
  })

  it('enables QStash for non-loopback app URL (cloud QStash)', async () => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }

    setEnv({
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
      QSTASH_URL: undefined,
      QSTASH_TOKEN: 'token',
      QSTASH_CURRENT_SIGNING_KEY: 'sig_current',
    })

    const mod = await import('@/lib/queue/qstash')
    expect(mod.isQstashConfigured()).toBe(true)
    expect(mod.getAbsoluteJobUrl('/api/jobs/example')).toBe(
      'https://example.com/api/jobs/example'
    )
  })
})
