import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  OrganizationContext,
  ORG_ID_HEADER,
  ORG_SLUG_HEADER,
  ORG_NAME_HEADER,
  getOrganizationContext,
  resolveOrganization,
  isOrganizationActive,
  isOrganizationPending,
  isOrganizationSuspended,
  isOrganizationDeleted,
  getOrganizationErrorPath,
  createOrganizationHeaders,
} from '@/lib/organization-context'
import { getCachedOrganization, setCachedOrganization } from '@/lib/redis'
import Organization from '@/models/organization.model'

const mockHeadersFn = vi.fn()

vi.mock('next/headers', () => ({
  headers: () => mockHeadersFn(),
}))

vi.mock('@/lib/redis', () => ({
  getCachedOrganization: vi.fn(),
  setCachedOrganization: vi.fn(),
}))

vi.mock('@/models/organization.model', () => ({
  default: {
    findBySlug: vi.fn(),
  },
}))

vi.mock('@/lib/db/conn', () => ({
  getMasterConnection: vi.fn(),
}))

describe('Organization Context Headers', () => {
  it('defines correct header names', () => {
    expect(ORG_ID_HEADER).toBe('x-organization-id')
    expect(ORG_SLUG_HEADER).toBe('x-organization-slug')
    expect(ORG_NAME_HEADER).toBe('x-organization-name')
  })
})

describe('getOrganizationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns context when all headers present', async () => {
    mockHeadersFn.mockResolvedValueOnce({
      get: (name: string) => {
        const headers: Record<string, string> = {
          'x-organization-id': '507f1f77bcf86cd799439011',
          'x-organization-slug': 'aces',
          'x-organization-name': 'ACES',
        }
        return headers[name] || null
      },
    })

    const result = await getOrganizationContext()

    expect(result).toEqual({
      id: '507f1f77bcf86cd799439011',
      slug: 'aces',
      name: 'ACES',
      status: 'active',
    })
  })

  it('returns null when id header missing', async () => {
    mockHeadersFn.mockResolvedValueOnce({
      get: (name: string) => {
        const headers: Record<string, string> = {
          'x-organization-slug': 'aces',
          'x-organization-name': 'ACES',
        }
        return headers[name] || null
      },
    })

    const result = await getOrganizationContext()
    expect(result).toBeNull()
  })

  it('returns null when slug header missing', async () => {
    mockHeadersFn.mockResolvedValueOnce({
      get: (name: string) => {
        const headers: Record<string, string> = {
          'x-organization-id': '507f1f77bcf86cd799439011',
          'x-organization-name': 'ACES',
        }
        return headers[name] || null
      },
    })

    const result = await getOrganizationContext()
    expect(result).toBeNull()
  })

  it('returns null when all headers missing', async () => {
    mockHeadersFn.mockResolvedValueOnce({
      get: () => null,
    })

    const result = await getOrganizationContext()
    expect(result).toBeNull()
  })
})

describe('resolveOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns cached organization when available', async () => {
    const cached: OrganizationContext = {
      id: '507f1f77bcf86cd799439011',
      slug: 'aces',
      name: 'ACES',
      status: 'active',
    }

    vi.mocked(getCachedOrganization).mockResolvedValueOnce(cached)

    const result = await resolveOrganization('aces')

    expect(result).toEqual(cached)
    expect(getCachedOrganization).toHaveBeenCalledWith('aces')
    expect(Organization.findBySlug).not.toHaveBeenCalled()
  })

  it('queries database on cache miss', async () => {
    vi.mocked(getCachedOrganization).mockResolvedValueOnce(null)

    vi.mocked(Organization.findBySlug).mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      slug: 'robotics',
      name: 'Robotics Club',
      status: 'active',
    } as any)

    const result = await resolveOrganization('robotics')

    expect(result).toEqual({
      id: '507f1f77bcf86cd799439011',
      slug: 'robotics',
      name: 'Robotics Club',
      status: 'active',
    })
    expect(Organization.findBySlug).toHaveBeenCalledWith('robotics')
  })

  it('caches active organizations', async () => {
    vi.mocked(getCachedOrganization).mockResolvedValueOnce(null)

    vi.mocked(Organization.findBySlug).mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      slug: 'tech',
      name: 'Tech Club',
      status: 'active',
    } as any)

    await resolveOrganization('tech')

    expect(setCachedOrganization).toHaveBeenCalledWith('tech', {
      id: '507f1f77bcf86cd799439011',
      slug: 'tech',
      name: 'Tech Club',
      status: 'active',
    })
  })

  it('does not cache non-active organizations', async () => {
    vi.mocked(getCachedOrganization).mockResolvedValueOnce(null)

    vi.mocked(Organization.findBySlug).mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      slug: 'pending-org',
      name: 'Pending Org',
      status: 'pending',
    } as any)

    await resolveOrganization('pending-org')

    expect(setCachedOrganization).not.toHaveBeenCalled()
  })

  it('returns null for non-existent organization', async () => {
    vi.mocked(getCachedOrganization).mockResolvedValueOnce(null)
    vi.mocked(Organization.findBySlug).mockResolvedValueOnce(null)

    const result = await resolveOrganization('nonexistent')

    expect(result).toBeNull()
  })
})

describe('Status Check Functions', () => {
  const activeOrg: OrganizationContext = {
    id: '1',
    slug: 'active',
    name: 'Active',
    status: 'active',
  }

  const pendingOrg: OrganizationContext = {
    id: '2',
    slug: 'pending',
    name: 'Pending',
    status: 'pending',
  }

  const suspendedOrg: OrganizationContext = {
    id: '3',
    slug: 'suspended',
    name: 'Suspended',
    status: 'suspended',
  }

  const deletedOrg: OrganizationContext = {
    id: '4',
    slug: 'deleted',
    name: 'Deleted',
    status: 'deleted',
  }

  describe('isOrganizationActive', () => {
    it('returns true for active organization', () => {
      expect(isOrganizationActive(activeOrg)).toBe(true)
    })

    it('returns false for non-active organizations', () => {
      expect(isOrganizationActive(pendingOrg)).toBe(false)
      expect(isOrganizationActive(suspendedOrg)).toBe(false)
      expect(isOrganizationActive(deletedOrg)).toBe(false)
    })

    it('returns false for null', () => {
      expect(isOrganizationActive(null)).toBe(false)
    })
  })

  describe('isOrganizationPending', () => {
    it('returns true for pending organization', () => {
      expect(isOrganizationPending(pendingOrg)).toBe(true)
    })

    it('returns false for non-pending organizations', () => {
      expect(isOrganizationPending(activeOrg)).toBe(false)
      expect(isOrganizationPending(suspendedOrg)).toBe(false)
      expect(isOrganizationPending(deletedOrg)).toBe(false)
    })
  })

  describe('isOrganizationSuspended', () => {
    it('returns true for suspended organization', () => {
      expect(isOrganizationSuspended(suspendedOrg)).toBe(true)
    })

    it('returns false for non-suspended organizations', () => {
      expect(isOrganizationSuspended(activeOrg)).toBe(false)
      expect(isOrganizationSuspended(pendingOrg)).toBe(false)
      expect(isOrganizationSuspended(deletedOrg)).toBe(false)
    })
  })

  describe('isOrganizationDeleted', () => {
    it('returns true for deleted organization', () => {
      expect(isOrganizationDeleted(deletedOrg)).toBe(true)
    })

    it('returns false for non-deleted organizations', () => {
      expect(isOrganizationDeleted(activeOrg)).toBe(false)
      expect(isOrganizationDeleted(pendingOrg)).toBe(false)
      expect(isOrganizationDeleted(suspendedOrg)).toBe(false)
    })
  })
})

describe('getOrganizationErrorPath', () => {
  it('returns /org-not-found for null organization', () => {
    expect(getOrganizationErrorPath(null)).toBe('/org-not-found')
  })

  it('returns /org-pending for pending status', () => {
    const org: OrganizationContext = {
      id: '1',
      slug: 'pending',
      name: 'Pending',
      status: 'pending',
    }
    expect(getOrganizationErrorPath(org)).toBe('/org-pending')
  })

  it('returns /org-suspended for suspended status', () => {
    const org: OrganizationContext = {
      id: '1',
      slug: 'suspended',
      name: 'Suspended',
      status: 'suspended',
    }
    expect(getOrganizationErrorPath(org)).toBe('/org-suspended')
  })

  it('returns /org-deleted for deleted status', () => {
    const org: OrganizationContext = {
      id: '1',
      slug: 'deleted',
      name: 'Deleted',
      status: 'deleted',
    }
    expect(getOrganizationErrorPath(org)).toBe('/org-deleted')
  })

  it('returns null for active status', () => {
    const org: OrganizationContext = {
      id: '1',
      slug: 'active',
      name: 'Active',
      status: 'active',
    }
    expect(getOrganizationErrorPath(org)).toBeNull()
  })
})

describe('createOrganizationHeaders', () => {
  it('creates headers with organization context', () => {
    const org: OrganizationContext = {
      id: '507f1f77bcf86cd799439011',
      slug: 'aces',
      name: 'ACES',
      status: 'active',
    }

    const headers = createOrganizationHeaders(org)

    expect(headers.get('x-organization-id')).toBe('507f1f77bcf86cd799439011')
    expect(headers.get('x-organization-slug')).toBe('aces')
    expect(headers.get('x-organization-name')).toBe('ACES')
  })

  it('returns Headers instance', () => {
    const org: OrganizationContext = {
      id: '1',
      slug: 'test',
      name: 'Test',
      status: 'active',
    }

    const headers = createOrganizationHeaders(org)
    expect(headers).toBeInstanceOf(Headers)
  })
})
