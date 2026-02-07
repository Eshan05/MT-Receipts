/**
 * @vitest-environment node
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest'
import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import type { IUser } from '@/models/user.model'
import type { IOrganization } from '@/models/organization.model'

vi.mock('@/lib/auth/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/auth/auth')>('@/lib/auth/auth')
  return {
    ...actual,
    getTokenServer: vi.fn(),
    verifyAuthToken: vi.fn(),
    setAuthCookie: vi.fn(),
    setCurrentOrgCookie: vi.fn(),
    clearAuthCookie: vi.fn(),
    clearCurrentOrgCookie: vi.fn(),
    getCurrentOrgSlug: vi.fn(),
  }
})

vi.mock('@/lib/redis', () => ({
  setCachedOrganization: vi.fn(),
  getCachedOrganization: vi.fn(),
  getRedis: vi.fn(() => null),
  redis: null,
}))

import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { GET, POST } from '@/app/api/sessions/route'

describe('GET /api/sessions', () => {
  let testUser!: IUser
  let org1!: IOrganization
  let org2!: IOrganization

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    testUser = await User.create({
      username: `session-user-${timestamp}`,
      email: `session-user-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    org1 = await Organization.create({
      name: 'Session Org 1',
      slug: `so1${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    org2 = await Organization.create({
      name: 'Session Org 2',
      slug: `so2${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    testUser.memberships.push(
      {
        organizationId: org1._id,
        organizationSlug: org1.slug,
        role: 'admin',
        approvedAt: new Date('2024-01-01'),
      },
      {
        organizationId: org2._id,
        organizationSlug: org2.slug,
        role: 'member',
        approvedAt: new Date('2024-02-01'),
      }
    )
    await testUser.save()
  })

  afterAll(async () => {
    await Organization.findByIdAndDelete(org1._id)
    await Organization.findByIdAndDelete(org2._id)
    await User.findByIdAndDelete(testUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getTokenServer).mockResolvedValue(undefined)

    const response = await GET()
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.authenticated).toBe(false)
  })

  it('returns user session with memberships', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.authenticated).toBe(true)
    expect(data.user.email).toBe(testUser.email)
    expect(data.memberships).toHaveLength(2)
  })

  it('returns currentOrganization from currentOrganizationSlug', async () => {
    testUser.currentOrganizationSlug = org2.slug
    await testUser.save()

    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.currentOrganization).toBeDefined()
    expect(data.currentOrganization.slug).toBe(org2.slug)
    expect(data.currentOrganization.role).toBe('member')
  })

  it('falls back to first membership when currentOrganizationSlug is not set', async () => {
    testUser.currentOrganizationSlug = undefined
    await testUser.save()

    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.currentOrganization).toBeDefined()
    expect(data.currentOrganization.slug).toBe(org1.slug)
  })

  it('falls back to first membership when currentOrganizationSlug does not match', async () => {
    testUser.currentOrganizationSlug = 'nonexistent-org'
    await testUser.save()

    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.currentOrganization).toBeDefined()
    expect(data.currentOrganization.slug).toBe(org1.slug)
  })

  it('returns null currentOrganization when user has no memberships', async () => {
    const timestamp = Date.now()
    const noMembershipsUser = await User.create({
      username: `no-memberships-${timestamp}`,
      email: `no-memberships-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({
      email: noMembershipsUser.email,
    })

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.authenticated).toBe(true)
    expect(data.memberships).toHaveLength(0)
    expect(data.currentOrganization).toBeNull()

    await User.findByIdAndDelete(noMembershipsUser._id)
  })
})

describe('POST /api/sessions (Organization Switch)', () => {
  let testUser!: IUser
  let org1!: IOrganization
  let org2!: IOrganization
  let otherOrg!: IOrganization

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    testUser = await User.create({
      username: `switch-user-${timestamp}`,
      email: `switch-user-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    org1 = await Organization.create({
      name: 'Switch Org 1',
      slug: `sw1${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    org2 = await Organization.create({
      name: 'Switch Org 2',
      slug: `sw2${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    otherOrg = await Organization.create({
      name: 'Other Org',
      slug: `oth${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    testUser.memberships.push(
      {
        organizationId: org1._id,
        organizationSlug: org1.slug,
        role: 'admin',
        approvedAt: new Date(),
      },
      {
        organizationId: org2._id,
        organizationSlug: org2.slug,
        role: 'member',
        approvedAt: new Date(),
      }
    )
    await testUser.save()
  })

  afterAll(async () => {
    await Organization.findByIdAndDelete(org1._id)
    await Organization.findByIdAndDelete(org2._id)
    await Organization.findByIdAndDelete(otherOrg._id)
    await User.findByIdAndDelete(testUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getTokenServer).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ action: 'switch', organizationSlug: org2.slug }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 403 when switching to non-member organization', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const request = new NextRequest('http://localhost:3000/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'switch',
        organizationSlug: otherOrg.slug,
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('returns 403 when organization does not exist (membership check first)', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const request = new NextRequest('http://localhost:3000/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'switch',
        organizationSlug: 'nonexistent-org',
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('switches organization and updates currentOrganizationSlug', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('valid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

    const request = new NextRequest('http://localhost:3000/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ action: 'switch', organizationSlug: org2.slug }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('switched')
    expect(data.currentOrganization.slug).toBe(org2.slug)
    expect(data.currentOrganization.role).toBe('member')

    const updatedUser = await User.findById(testUser._id)
    expect(updatedUser?.currentOrganizationSlug).toBe(org2.slug)
  })
})
