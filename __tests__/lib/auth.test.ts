/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

describe('Auth Cookie Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setCurrentOrgCookie', () => {
    it('sets the currentOrganization cookie', async () => {
      const response = NextResponse.json({ ok: true })
      const mockSet = vi.spyOn(response.cookies, 'set')

      const { setCurrentOrgCookie } = await import('@/lib/auth')
      await setCurrentOrgCookie('my-org', response)

      expect(mockSet).toHaveBeenCalledWith({
        name: 'currentOrganization',
        value: 'my-org',
        path: '/',
        sameSite: 'strict',
        maxAge: 2592000,
      })
    })
  })

  describe('clearCurrentOrgCookie', () => {
    it('clears the currentOrganization cookie', async () => {
      const response = NextResponse.json({ ok: true })
      const mockSet = vi.spyOn(response.cookies, 'set')

      const { clearCurrentOrgCookie } = await import('@/lib/auth')
      await clearCurrentOrgCookie(response)

      expect(mockSet).toHaveBeenCalledWith({
        name: 'currentOrganization',
        value: '',
        path: '/',
        maxAge: 0,
      })
    })
  })
})
