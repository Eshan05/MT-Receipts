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
import { GET } from '@/app/api/organizations/[slug]/members/route'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    getTokenServer: vi.fn(),
    verifyAuthToken: vi.fn(),
  }
})

import { getTokenServer, verifyAuthToken } from '@/lib/auth'

describe('GET /api/organizations/[slug]/members', () => {
  let adminUser: any
  let memberUser: any
  let nonMemberUser: any
  let organization: any

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `members-admin-${timestamp}`,
      email: `members-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    memberUser = await User.create({
      username: `members-member-${timestamp}`,
      email: `members-member-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    nonMemberUser = await User.create({
      username: `members-nonmember-${timestamp}`,
      email: `members-nonmember-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Members Org',
      slug: `tmo${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: adminUser._id,
    })

    adminUser.memberships.push({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      role: 'admin',
      approvedAt: new Date('2024-01-01'),
    })
    await adminUser.save()

    memberUser.memberships.push({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      role: 'member',
      approvedAt: new Date('2024-02-01'),
    })
    await memberUser.save()
  })

  afterAll(async () => {
    await Organization.findByIdAndDelete(organization._id)
    await User.findByIdAndDelete(adminUser._id)
    await User.findByIdAndDelete(memberUser._id)
    await User.findByIdAndDelete(nonMemberUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getTokenServer).mockResolvedValue(undefined)

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members`
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: organization.slug }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('invalid-token')
    vi.mocked(verifyAuthToken).mockResolvedValue(null)

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members`
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: organization.slug }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({
      email: 'nonexistent@test.local',
    })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members`
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: organization.slug }),
    })
    expect(response.status).toBe(404)
  })

  it('returns 404 when organization not found', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      'http://localhost:3000/api/organizations/nonexistent-org/members'
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: 'nonexistent-org' }),
    })
    expect(response.status).toBe(404)
  })

  it('returns 403 when user is not a member', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: nonMemberUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members`
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: organization.slug }),
    })
    expect(response.status).toBe(403)
  })

  it('returns members list for admin user', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members`
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: organization.slug }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.members).toHaveLength(2)

    const admin = data.members.find(
      (m: any) => m.userId.toString() === adminUser._id.toString()
    )
    expect(admin).toBeDefined()
    expect(admin.username).toBe(adminUser.username)
    expect(admin.email).toBe(adminUser.email)
    expect(admin.role).toBe('admin')
    expect(admin.joinedAt).toBeDefined()

    const member = data.members.find(
      (m: any) => m.userId.toString() === memberUser._id.toString()
    )
    expect(member).toBeDefined()
    expect(member.role).toBe('member')
  })

  it('returns members list for regular member', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: memberUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members`
    )
    const response = await GET(request, {
      params: Promise.resolve({ slug: organization.slug }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.members).toHaveLength(2)
  })
})
