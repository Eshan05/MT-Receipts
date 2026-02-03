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
import { GET } from '@/app/api/invitations/route'
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

describe('GET /api/invitations', () => {
  let testUser: any
  let otherUser: any
  let organization1: any
  let organization2: any
  let invite1: any
  let invite2: any
  let invite3ForOtherUser: any

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    testUser = await User.create({
      username: `inv-user-${timestamp}`,
      email: `inv-user-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    otherUser = await User.create({
      username: `inv-other-${timestamp}`,
      email: `inv-other-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization1 = await Organization.create({
      name: 'Test Invitations Org 1',
      slug: `tio1${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    organization2 = await Organization.create({
      name: 'Test Invitations Org 2',
      slug: `tio2${timestamp}`.slice(0, 20),
      status: 'active',
      createdBy: testUser._id,
    })

    invite1 = await MembershipRequest.create({
      organizationId: organization1._id,
      organizationSlug: organization1.slug,
      type: 'email',
      email: testUser.email,
      invitedBy: otherUser._id,
      role: 'member',
      status: 'pending',
    })

    invite2 = await MembershipRequest.create({
      organizationId: organization2._id,
      organizationSlug: organization2.slug,
      type: 'email',
      email: testUser.email,
      invitedBy: otherUser._id,
      role: 'admin',
      status: 'pending',
    })

    invite3ForOtherUser = await MembershipRequest.create({
      organizationId: organization1._id,
      organizationSlug: organization1.slug,
      type: 'email',
      email: otherUser.email,
      invitedBy: testUser._id,
      role: 'member',
      status: 'pending',
    })
  })

  afterAll(async () => {
    await MembershipRequest.findByIdAndDelete(invite1._id)
    await MembershipRequest.findByIdAndDelete(invite2._id)
    await MembershipRequest.findByIdAndDelete(invite3ForOtherUser._id)
    await Organization.findByIdAndDelete(organization1._id)
    await Organization.findByIdAndDelete(organization2._id)
    await User.findByIdAndDelete(testUser._id)
    await User.findByIdAndDelete(otherUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getTokenServer).mockResolvedValue(undefined)

      const response = await GET()
      expect(response.status).toBe(401)
    })
  })

  describe('Get User Invitations', () => {
    it('returns empty array when user has no invitations', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: otherUser.email })

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('returns all pending invitations for user', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)

      const orgIds = data.map((inv: any) => inv.organizationId)
      expect(orgIds).toContain(organization1._id.toString())
      expect(orgIds).toContain(organization2._id.toString())
    })

    it('includes organization details in response', async () => {
      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()

      const invite = data.find(
        (inv: any) => inv.organizationId === organization1._id.toString()
      )
      expect(invite).toBeDefined()
      expect(invite.organizationName).toBe(organization1.name)
      expect(invite.organizationSlug).toBe(organization1.slug)
      expect(invite.role).toBe('member')
    })

    it('excludes expired invitations', async () => {
      const expiredInvite = await MembershipRequest.create({
        organizationId: organization1._id,
        organizationSlug: organization1.slug,
        type: 'email',
        email: testUser.email,
        invitedBy: otherUser._id,
        role: 'member',
        status: 'pending',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      })

      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.length).toBe(2)
      await MembershipRequest.findByIdAndDelete(expiredInvite._id)
    })

    it('excludes accepted/rejected invitations', async () => {
      const acceptedInvite = await MembershipRequest.create({
        organizationId: organization1._id,
        organizationSlug: organization1.slug,
        type: 'email',
        email: testUser.email,
        invitedBy: otherUser._id,
        role: 'member',
        status: 'accepted',
      })

      vi.mocked(getTokenServer).mockResolvedValue('token')
      vi.mocked(verifyAuthToken).mockResolvedValue({ email: testUser.email })

      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.length).toBe(2)

      await MembershipRequest.findByIdAndDelete(acceptedInvite._id)
    })
  })
})
