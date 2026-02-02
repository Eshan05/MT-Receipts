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
import { POST } from '@/app/api/invites/route'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    getTokenServer: vi.fn(),
    verifyAuthToken: vi.fn(),
  }
})

import { getTokenServer, verifyAuthToken } from '@/lib/auth'

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
}))

describe('POST /api/invites', () => {
  let adminUser: any
  let memberUser: any
  let nonMemberUser: any
  let organization: any

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `admin-${timestamp}`,
      email: `admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    memberUser = await User.create({
      username: `member-${timestamp}`,
      email: `member-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    nonMemberUser = await User.create({
      username: `nonmember-${timestamp}`,
      email: `nonmember-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Invite Org',
      slug: `tinv${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: adminUser._id,
    })

    adminUser.memberships.push({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      role: 'admin',
      approvedAt: new Date(),
    })
    await adminUser.save()

    memberUser.memberships.push({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      role: 'member',
      approvedAt: new Date(),
    })
    await memberUser.save()
  })

  afterAll(async () => {
    await MembershipRequest.deleteMany({ organizationId: organization._id })
    await Organization.findByIdAndDelete(organization._id)
    await User.findByIdAndDelete(adminUser._id)
    await User.findByIdAndDelete(memberUser._id)
    await User.findByIdAndDelete(nonMemberUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getTokenServer).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: organization.slug,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('returns 403 when user is not a member of the organization', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('non-member-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({
        email: nonMemberUser.email,
      })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: organization.slug,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(403)
    })

    it('returns 403 when user is a member but not admin', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('member-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: memberUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: organization.slug,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('returns 400 when type is missing', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({ organizationSlug: organization.slug }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid option')
    })

    it('returns 400 when organizationSlug is missing', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({ type: 'code' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid input')
    })

    it('returns 400 when type is email but email is missing', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          organizationSlug: organization.slug,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('email')
    })

    it('returns 404 when organization not found', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: 'non-existent-org',
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
    })
  })

  describe('Create Code Invite', () => {
    it('creates a shareable code invite successfully', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: organization.slug,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.code).toBeDefined()
      expect(data.code.length).toBeGreaterThanOrEqual(8)
      expect(data.organizationSlug).toBe(organization.slug)
      expect(data.role).toBe('member')

      const invite = await MembershipRequest.findOne({ code: data.code })
      expect(invite).toBeDefined()
      expect(invite?.type).toBe('code')
      expect(invite?.status).toBe('pending')
    })

    it('creates a code invite with custom expiry and maxUses', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: organization.slug,
          expiresAt: expiresAt.toISOString(),
          maxUses: 10,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.maxUses).toBe(10)

      const invite = await MembershipRequest.findOne({ code: data.code })
      expect(invite?.maxUses).toBe(10)
      expect(invite?.expiresAt).toBeDefined()
    })

    it('creates a code invite with custom role', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'code',
          organizationSlug: organization.slug,
          role: 'admin',
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.role).toBe('admin')
    })
  })

  describe('Create Email Invite', () => {
    it('creates an email invite successfully', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const inviteEmail = `invited-${Date.now()}@test.local`
      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          organizationSlug: organization.slug,
          email: inviteEmail,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.email).toBe(inviteEmail)
      expect(data.code).toBeUndefined()

      const invite = await MembershipRequest.findOne({ email: inviteEmail })
      expect(invite).toBeDefined()
      expect(invite?.type).toBe('email')
    })

    it('returns 400 when user is already a member', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          organizationSlug: organization.slug,
          email: memberUser.email,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('already a member')
    })

    it('returns 400 when pending invite already exists for email', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('admin-token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

      const inviteEmail = `duplicate-${Date.now()}@test.local`

      await MembershipRequest.create({
        organizationId: organization._id,
        organizationSlug: organization.slug,
        type: 'email',
        email: inviteEmail,
        invitedBy: adminUser._id,
        role: 'member',
        status: 'pending',
      })

      const request = new NextRequest('http://localhost:3000/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          organizationSlug: organization.slug,
          email: inviteEmail,
        }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('pending')
    })
  })
})
