/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Auth Cookie Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setCurrentOrgCookie', () => {
    it('sets the currentOrganization cookie', async () => {
      const mockSet = vi.fn()
      const mockResponse = {
        cookies: {
          set: mockSet,
        },
      }

      const { setCurrentOrgCookie } = await import('@/lib/auth')
      await setCurrentOrgCookie('my-org', mockResponse as any)

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
      const mockSet = vi.fn()
      const mockResponse = {
        cookies: {
          set: mockSet,
        },
      }

      const { clearCurrentOrgCookie } = await import('@/lib/auth')
      await clearCurrentOrgCookie(mockResponse as any)

      expect(mockSet).toHaveBeenCalledWith({
        name: 'currentOrganization',
        value: '',
        path: '/',
        maxAge: 0,
      })
    })
  })
})
