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
import { POST } from '@/app/api/memberships/route'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'
import type { IUser } from '@/models/user.model'
import type { IOrganization } from '@/models/organization.model'
import type { IMembershipRequest } from '@/models/membership-request.model'

vi.mock('@/lib/auth/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/auth/auth')>('@/lib/auth/auth')
  return {
    ...actual,
    getTokenServer: vi.fn(),
    verifyAuthToken: vi.fn(),
  }
})

import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'

describe('POST /api/memberships', () => {
  let adminUser!: IUser
  let newUser!: IUser
  let existingMemberUser!: IUser
  let organization!: IOrganization
  let validCodeInvite!: IMembershipRequest
  let expiredCodeInvite!: IMembershipRequest
  let usedUpCodeInvite!: IMembershipRequest

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `mem-admin-${timestamp}`,
      email: `mem-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    newUser = await User.create({
      username: `mem-new-${timestamp}`,
      email: `mem-new-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    existingMemberUser = await User.create({
      username: `mem-existing-${timestamp}`,
      email: `mem-existing-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Membership Org',
      slug: `tmo${timestamp}`.slice(0, 20),
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

    existingMemberUser.memberships.push({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      role: 'member',
      approvedAt: new Date(),
    })
    await existingMemberUser.save()

    validCodeInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code: 'VALIDCODE1',
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      maxUses: 5,
      usedCount: 0,
    })

    expiredCodeInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code: 'EXPIREDMEM',
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })

    usedUpCodeInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code: 'USEDUPMEM',
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      maxUses: 1,
      usedCount: 1,
    })
  })

  afterAll(async () => {
    await MembershipRequest.deleteMany({ organizationId: organization._id })
    await Organization.findByIdAndDelete(organization._id)
    await User.findByIdAndDelete(adminUser._id)
    await User.findByIdAndDelete(newUser._id)
    await User.findByIdAndDelete(existingMemberUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getTokenServer).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'VALIDCODE1' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('returns 400 when inviteCode is missing', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: newUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Join Organization', () => {
    it('returns 403 when organization maxUsers is reached', async () => {
      const limitedUser = await User.create({
        username: `mem-limit-${Date.now()}`,
        email: `mem-limit-${Date.now()}@test.local`,
        passhash: 'hashedpassword',
        memberships: [],
      })

      await Organization.findByIdAndUpdate(organization._id, {
        'limits.maxUsers': 2,
      })

      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: limitedUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'VALIDCODE1' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(403)

      await Organization.findByIdAndUpdate(organization._id, {
        'limits.maxUsers': -1,
      })
      await User.findByIdAndDelete(limitedUser._id)
    })

    it('returns 404 for invalid invite code', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: newUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'INVALIDCODE' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
    })

    it('returns 404 for expired invite code', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: newUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'EXPIREDMEM' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
    })

    it('returns 404 for used up invite code', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: newUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'USEDUPMEM' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
    })

    it('returns 400 when user is already a member', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({
        email: existingMemberUser.email,
      })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'VALIDCODE1' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('already a member')
    })

    it('successfully joins organization with valid code', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: newUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'VALIDCODE1' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('Successfully joined')
      expect(data.organization.slug).toBe(organization.slug)

      const updatedUser = await User.findById(newUser._id)
      const membership = updatedUser?.memberships.find(
        (m) => m.organizationId.toString() === organization._id.toString()
      )
      expect(membership).toBeDefined()
      expect(membership?.role).toBe('member')

      const updatedInvite = await MembershipRequest.findById(
        validCodeInvite._id
      )
      expect(updatedInvite?.usedCount).toBe(1)
    })

    it('handles lowercase code by converting to uppercase', async () => {
      const anotherUser = await User.create({
        username: `mem-lower-${Date.now()}`,
        email: `mem-lower-${Date.now()}@test.local`,
        passhash: 'hashedpassword',
        memberships: [],
      })

      const newCode = await MembershipRequest.create({
        organizationId: organization._id,
        organizationSlug: organization.slug,
        type: 'code',
        code: 'LOWERCASE',
        invitedBy: adminUser._id,
        role: 'member',
        status: 'pending',
        maxUses: 1,
        usedCount: 0,
      })

      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: anotherUser.email })

      const request = new NextRequest('http://localhost:3000/api/memberships', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: 'lowercase' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(200)

      await User.findByIdAndDelete(anotherUser._id)
      await MembershipRequest.findByIdAndDelete(newCode._id)
    })
  })
})
