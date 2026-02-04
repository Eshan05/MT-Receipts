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
import { GET, DELETE } from '@/app/api/invites/[code]/route'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'
import type { IUser } from '@/models/user.model'
import type { IOrganization } from '@/models/organization.model'
import type { IMembershipRequest } from '@/models/membership-request.model'

vi.mock('@/lib/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    getTokenServer: vi.fn(),
    verifyAuthToken: vi.fn(),
  }
})

import { getTokenServer, verifyAuthToken } from '@/lib/auth'

describe('GET /api/invites/[code]', () => {
  let adminUser!: IUser
  let organization!: IOrganization
  let codeInvite!: IMembershipRequest
  let emailInvite!: IMembershipRequest
  let expiredInvite!: IMembershipRequest
  let usedUpInvite!: IMembershipRequest

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `invites-admin-${timestamp}`,
      email: `invites-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Get Invite Org',
      slug: `tgi${timestamp}`.slice(0, 20),
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

    codeInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code: 'TESTCODE1',
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      maxUses: 5,
      usedCount: 2,
    })

    emailInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'email',
      email: `invited-user-${timestamp}@test.local`,
      invitedBy: adminUser._id,
      role: 'admin',
      status: 'pending',
    })

    expiredInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code: 'EXPIREDCD',
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })

    usedUpInvite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code: 'USEDUPCODE',
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
      maxUses: 2,
      usedCount: 2,
    })
  })

  afterAll(async () => {
    await MembershipRequest.deleteMany({ organizationId: organization._id })
    await Organization.findByIdAndDelete(organization._id)
    await User.findByIdAndDelete(adminUser._id)
  })

  it('returns invite details for valid code invite', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/invites/TESTCODE1'
    )
    const response = await GET(request, {
      params: Promise.resolve({ code: 'TESTCODE1' }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.type).toBe('code')
    expect(data.code).toBeUndefined()
    expect(data.organization.name).toBe(organization.name)
    expect(data.organization.slug).toBe(organization.slug)
    expect(data.role).toBe('member')
    expect(data.maxUses).toBe(5)
    expect(data.usedCount).toBe(2)
    expect(data.remainingUses).toBe(3)
  })

  it('returns invite details for email invite by ID', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/invites/${emailInvite._id}`
    )
    const response = await GET(request, {
      params: Promise.resolve({ code: emailInvite._id.toString() }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.type).toBe('email')
    expect(data.role).toBe('admin')
    expect(data.maxUses).toBeUndefined()
    expect(data.usedCount).toBeUndefined()
  })

  it('returns 404 for non-existent code', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/invites/NONEXIST'
    )
    const response = await GET(request, {
      params: Promise.resolve({ code: 'NONEXIST' }),
    })
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toContain('Invalid')
  })

  it('returns 410 for expired invite', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/invites/EXPIREDCD'
    )
    const response = await GET(request, {
      params: Promise.resolve({ code: 'EXPIREDCD' }),
    })
    expect(response.status).toBe(410)
    const data = await response.json()
    expect(data.error).toContain('expired')
  })

  it('returns 410 for invite that reached max uses', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/invites/USEDUPCODE'
    )
    const response = await GET(request, {
      params: Promise.resolve({ code: 'USEDUPCODE' }),
    })
    expect(response.status).toBe(410)
    const data = await response.json()
    expect(data.error).toContain('maximum uses')
  })

  it('handles lowercase code by converting to uppercase', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/invites/testcode1'
    )
    const response = await GET(request, {
      params: Promise.resolve({ code: 'testcode1' }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.type).toBe('code')
  })
})

describe('DELETE /api/invites/[code]', () => {
  let adminUser!: IUser
  let otherUser!: IUser
  let organization!: IOrganization
  let codeInvite!: IMembershipRequest
  let emailInvite!: IMembershipRequest

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `delete-admin-${timestamp}`,
      email: `delete-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    otherUser = await User.create({
      username: `delete-other-${timestamp}`,
      email: `delete-other-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Delete Invite Org',
      slug: `tdi${timestamp}`.slice(0, 20),
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
  })

  afterAll(async () => {
    await MembershipRequest.deleteMany({ organizationId: organization._id })
    await Organization.findByIdAndDelete(organization._id)
    await User.findByIdAndDelete(adminUser._id)
    await User.findByIdAndDelete(otherUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getTokenServer).mockResolvedValue(undefined)

    const request = new NextRequest(
      'http://localhost:3000/api/invites/SOMECODE',
      {
        method: 'DELETE',
      }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ code: 'SOMECODE' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 for non-existent invite', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      'http://localhost:3000/api/invites/NONEXIST',
      {
        method: 'DELETE',
      }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ code: 'NONEXIST' }),
    })
    expect(response.status).toBe(404)
  })

  it('rejects email invite by ID when user is the invitee', async () => {
    const inviteEmail = `reject-me-${Date.now()}@test.local`

    const invite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'email',
      email: inviteEmail,
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
    })

    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: inviteEmail })

    const request = new NextRequest(
      `http://localhost:3000/api/invites/${invite._id}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ code: invite._id.toString() }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('rejected')

    const updatedInvite = await MembershipRequest.findById(invite._id)
    expect(updatedInvite?.status).toBe('cancelled')
  })

  it('returns 403 when user is not the invitee of email invite', async () => {
    const invite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'email',
      email: `not-yours-${Date.now()}@test.local`,
      invitedBy: adminUser._id,
      role: 'member',
      status: 'pending',
    })

    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: otherUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/invites/${invite._id}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ code: invite._id.toString() }),
    })
    expect(response.status).toBe(403)

    await MembershipRequest.findByIdAndDelete(invite._id)
  })
})
