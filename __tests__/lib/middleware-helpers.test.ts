/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  PUBLIC_PATHS,
  SUPERADMIN_PATHS,
  STATIC_PATHS,
  NON_TENANT_PATHS,
  isStaticPath,
  isPublicPath,
  isSuperAdminPath,
  isNonTenantPath,
  isReservedSlug,
  extractSlugFromPath,
  createRedirectUrl,
  getPathSegments,
  isApiRoute,
  isPublicReceiptView,
} from '@/lib/middleware-helpers'

describe('Path Constants', () => {
  describe('PUBLIC_PATHS', () => {
    it('contains expected public paths', () => {
      expect(PUBLIC_PATHS).toContain('/')
      expect(PUBLIC_PATHS).toContain('/v')
      expect(PUBLIC_PATHS).toContain('/verify')
      expect(PUBLIC_PATHS).toContain('/login')
      expect(PUBLIC_PATHS).toContain('/signup')
      expect(PUBLIC_PATHS).toContain('/o')
    })
  })

  describe('SUPERADMIN_PATHS', () => {
    it('contains superadmin paths', () => {
      expect(SUPERADMIN_PATHS).toContain('/s')
      expect(SUPERADMIN_PATHS).toContain('/superadmin')
      expect(SUPERADMIN_PATHS).toContain('/api/admins')
    })
  })

  describe('STATIC_PATHS', () => {
    it('contains static paths', () => {
      expect(STATIC_PATHS).toContain('/favicon.ico')
      expect(STATIC_PATHS).toContain('/_next')
      expect(STATIC_PATHS).toContain('/api')
    })
  })

  describe('NON_TENANT_PATHS', () => {
    it('contains non-tenant path segments', () => {
      expect(NON_TENANT_PATHS).toContain('v')
      expect(NON_TENANT_PATHS).toContain('verify')
      expect(NON_TENANT_PATHS).toContain('api')
      expect(NON_TENANT_PATHS).toContain('superadmin')
      expect(NON_TENANT_PATHS).toContain('o')
    })
  })
})

describe('isStaticPath', () => {
  it('returns true for favicon', () => {
    expect(isStaticPath('/favicon.ico')).toBe(true)
  })

  it('returns true for _next paths', () => {
    expect(isStaticPath('/_next/static/chunk.js')).toBe(true)
    expect(isStaticPath('/_next/image')).toBe(true)
  })

  it('returns true for api routes', () => {
    expect(isStaticPath('/api/users')).toBe(true)
    expect(isStaticPath('/api/sessions')).toBe(true)
  })

  it('returns false for tenant paths', () => {
    expect(isStaticPath('/aces')).toBe(false)
    expect(isStaticPath('/robotics/events')).toBe(false)
  })

  it('returns false for root path', () => {
    expect(isStaticPath('/')).toBe(false)
  })
})

describe('isPublicPath', () => {
  it('returns true for root path', () => {
    expect(isPublicPath('/')).toBe(true)
  })

  it('returns true for login path', () => {
    expect(isPublicPath('/login')).toBe(true)
  })

  it('returns true for signup path', () => {
    expect(isPublicPath('/signup')).toBe(true)
  })

  it('returns true for organization path', () => {
    expect(isPublicPath('/o')).toBe(true)
  })

  it('returns true for verify path', () => {
    expect(isPublicPath('/verify')).toBe(true)
    expect(isPublicPath('/verify/anything')).toBe(true)
  })

  it('returns true for public path subroutes', () => {
    expect(isPublicPath('/api/sessions')).toBe(true)
    expect(isPublicPath('/api/users')).toBe(true)
  })

  it('returns false for tenant paths', () => {
    expect(isPublicPath('/aces')).toBe(false)
    expect(isPublicPath('/aces/events')).toBe(false)
  })

  it('returns false for superadmin paths', () => {
    expect(isPublicPath('/superadmin')).toBe(false)
  })
})

describe('isSuperAdminPath', () => {
  it('returns true for superadmin path', () => {
    expect(isSuperAdminPath('/s')).toBe(true)
    expect(isSuperAdminPath('/s/dashboard')).toBe(true)
    expect(isSuperAdminPath('/superadmin')).toBe(true)
    expect(isSuperAdminPath('/superadmin/organizations')).toBe(true)
  })

  it('returns true for superadmin api routes', () => {
    expect(isSuperAdminPath('/api/admins')).toBe(true)
    expect(isSuperAdminPath('/api/admins/organizations')).toBe(true)
  })

  it('does not match unrelated /s-prefixed paths', () => {
    expect(isSuperAdminPath('/signup')).toBe(false)
    expect(isSuperAdminPath('/sessions')).toBe(false)
  })

  it('returns false for tenant paths', () => {
    expect(isSuperAdminPath('/aces')).toBe(false)
  })

  it('returns false for other api routes', () => {
    expect(isSuperAdminPath('/api/users')).toBe(false)
  })
})

describe('isNonTenantPath', () => {
  it('returns true for non-tenant segments', () => {
    expect(isNonTenantPath('v')).toBe(true)
    expect(isNonTenantPath('verify')).toBe(true)
    expect(isNonTenantPath('api')).toBe(true)
    expect(isNonTenantPath('s')).toBe(true)
    expect(isNonTenantPath('superadmin')).toBe(true)
    expect(isNonTenantPath('login')).toBe(true)
    expect(isNonTenantPath('o')).toBe(true)
  })

  it('returns false for tenant segments', () => {
    expect(isNonTenantPath('aces')).toBe(false)
    expect(isNonTenantPath('robotics')).toBe(false)
    expect(isNonTenantPath('tech-club')).toBe(false)
  })
})

describe('isReservedSlug', () => {
  it('returns true for reserved slugs', () => {
    expect(isReservedSlug('api')).toBe(true)
    expect(isReservedSlug('admin')).toBe(true)
    expect(isReservedSlug('login')).toBe(true)
    expect(isReservedSlug('superadmin')).toBe(true)
    expect(isReservedSlug('settings')).toBe(true)
  })

  it('returns true regardless of case', () => {
    expect(isReservedSlug('API')).toBe(true)
    expect(isReservedSlug('Login')).toBe(true)
    expect(isReservedSlug('SUPERADMIN')).toBe(true)
  })

  it('returns false for valid organization slugs', () => {
    expect(isReservedSlug('aces')).toBe(false)
    expect(isReservedSlug('robotics')).toBe(false)
    expect(isReservedSlug('tech-club')).toBe(false)
  })
})

describe('extractSlugFromPath', () => {
  it('extracts slug from single segment path', () => {
    expect(extractSlugFromPath('/aces')).toBe('aces')
    expect(extractSlugFromPath('/robotics')).toBe('robotics')
  })

  it('extracts slug from multi-segment path', () => {
    expect(extractSlugFromPath('/aces/events')).toBe('aces')
    expect(extractSlugFromPath('/robotics/receipts/new')).toBe('robotics')
  })

  it('lowercases slug', () => {
    expect(extractSlugFromPath('/ACES')).toBe('aces')
    expect(extractSlugFromPath('/ROBOTICS/events')).toBe('robotics')
  })

  it('returns null for root path', () => {
    expect(extractSlugFromPath('/')).toBe(null)
  })

  it('returns null for non-tenant paths', () => {
    expect(extractSlugFromPath('/v/RC-001')).toBe(null)
    expect(extractSlugFromPath('/verify')).toBe(null)
    expect(extractSlugFromPath('/s/dashboard')).toBe(null)
    expect(extractSlugFromPath('/api/users')).toBe(null)
    expect(extractSlugFromPath('/superadmin')).toBe(null)
    expect(extractSlugFromPath('/login')).toBe(null)
  })

  it('returns null for reserved slugs', () => {
    expect(extractSlugFromPath('/admin')).toBe(null)
    expect(extractSlugFromPath('/settings')).toBe(null)
  })

  it('returns null for error pages', () => {
    expect(extractSlugFromPath('/o/404')).toBe(null)
    expect(extractSlugFromPath('/o/202')).toBe(null)
    expect(extractSlugFromPath('/o/403')).toBe(null)
    expect(extractSlugFromPath('/o/410')).toBe(null)
  })
})

describe('createRedirectUrl', () => {
  it('creates redirect URL with new path', () => {
    const mockUrl = new URL('http://localhost:3000/aces/events')
    const mockRequest = {
      nextUrl: {
        clone: () => mockUrl,
      },
    }

    const url = createRedirectUrl(mockRequest, '/o/404')
    expect(url.pathname).toBe('/o/404')
    expect(url.origin).toBe('http://localhost:3000')
  })
})

describe('getPathSegments', () => {
  it('splits path into segments', () => {
    expect(getPathSegments('/aces/events')).toEqual(['aces', 'events'])
  })

  it('handles single segment', () => {
    expect(getPathSegments('/aces')).toEqual(['aces'])
  })

  it('handles root path', () => {
    expect(getPathSegments('/')).toEqual([])
  })

  it('handles trailing slash', () => {
    expect(getPathSegments('/aces/events/')).toEqual(['aces', 'events'])
  })

  it('handles multiple slashes', () => {
    expect(getPathSegments('/aces//events')).toEqual(['aces', 'events'])
  })
})

describe('isApiRoute', () => {
  it('returns true for api routes', () => {
    expect(isApiRoute('/api/users')).toBe(true)
    expect(isApiRoute('/api/sessions')).toBe(true)
    expect(isApiRoute('/api/admins/organizations')).toBe(true)
  })

  it('returns false for non-api routes', () => {
    expect(isApiRoute('/aces')).toBe(false)
    expect(isApiRoute('/login')).toBe(false)
    expect(isApiRoute('/superadmin')).toBe(false)
  })
})

describe('isPublicReceiptView', () => {
  it('returns true for public receipt paths', () => {
    expect(isPublicReceiptView('/v/RC-001')).toBe(true)
    expect(isPublicReceiptView('/v/RCP-2025-001')).toBe(true)
  })

  it('returns true for v path root', () => {
    expect(isPublicReceiptView('/v')).toBe(true)
  })

  it('returns false for non-receipt paths', () => {
    expect(isPublicReceiptView('/aces')).toBe(false)
    expect(isPublicReceiptView('/api/receipts')).toBe(false)
  })
})
