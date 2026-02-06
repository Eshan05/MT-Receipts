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
import {
  PATCH,
  DELETE,
} from '@/app/api/organizations/[slug]/members/[userId]/route'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import type { IUser } from '@/models/user.model'
import type { IOrganization } from '@/models/organization.model'

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

describe('PATCH /api/organizations/[slug]/members/[userId]', () => {
  let adminUser!: IUser
  let memberUser!: IUser
  let otherAdminUser!: IUser
  let nonMemberUser!: IUser
  let organization!: IOrganization

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `role-admin-${timestamp}`,
      email: `role-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    memberUser = await User.create({
      username: `role-member-${timestamp}`,
      email: `role-member-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    otherAdminUser = await User.create({
      username: `role-other-admin-${timestamp}`,
      email: `role-other-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    nonMemberUser = await User.create({
      username: `role-nonmember-${timestamp}`,
      email: `role-nonmember-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Role Update Org',
      slug: `tru${timestamp}`.slice(0, 20),
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

    otherAdminUser.memberships.push({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      role: 'admin',
      approvedAt: new Date(),
    })
    await otherAdminUser.save()
  })

  afterAll(async () => {
    await Organization.findByIdAndDelete(organization._id)
    await User.findByIdAndDelete(adminUser._id)
    await User.findByIdAndDelete(memberUser._id)
    await User.findByIdAndDelete(otherAdminUser._id)
    await User.findByIdAndDelete(nonMemberUser._id)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getTokenServer).mockResolvedValue(undefined)

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${memberUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: memberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not an admin', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: memberUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${memberUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: memberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(403)
  })

  it('returns 404 when organization not found', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/nonexistent/members/${memberUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: 'nonexistent',
        userId: memberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(404)
  })

  it('returns 404 when target user not found', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const fakeUserId = '507f1f77bcf86cd799439011'
    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${fakeUserId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({ slug: organization.slug, userId: fakeUserId }),
    })
    expect(response.status).toBe(404)
  })

  it('returns 400 when target user is not a member', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${nonMemberUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: nonMemberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${memberUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'superadmin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: memberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(400)
  })

  it('updates member role to admin', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${memberUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: memberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('updated')

    const updatedUser = await User.findById(memberUser._id)
    const membership = updatedUser?.memberships.find(
      (m) => m.organizationId.toString() === organization._id.toString()
    )
    expect(membership?.role).toBe('admin')

    memberUser.memberships[0].role = 'member'
    await memberUser.save()
  })

  it('updates admin role to member', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${otherAdminUser._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'member' }),
      }
    )
    const response = await PATCH(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: otherAdminUser._id.toString(),
      }),
    })
    expect(response.status).toBe(200)

    const updatedUser = await User.findById(otherAdminUser._id)
    const membership = updatedUser?.memberships.find(
      (m) => m.organizationId.toString() === organization._id.toString()
    )
    expect(membership?.role).toBe('member')

    otherAdminUser.memberships[0].role = 'admin'
    await otherAdminUser.save()
  })
})

describe('DELETE /api/organizations/[slug]/members/[userId]', () => {
  let adminUser!: IUser
  let memberUser!: IUser
  let nonMemberUser!: IUser
  let organization!: IOrganization

  beforeAll(async () => {
    await dbConnect()

    const timestamp = Date.now()

    adminUser = await User.create({
      username: `remove-admin-${timestamp}`,
      email: `remove-admin-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    memberUser = await User.create({
      username: `remove-member-${timestamp}`,
      email: `remove-member-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    nonMemberUser = await User.create({
      username: `remove-nonmember-${timestamp}`,
      email: `remove-nonmember-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [],
    })

    organization = await Organization.create({
      name: 'Test Remove Member Org',
      slug: `trm${timestamp}`.slice(0, 20),
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
      `http://localhost:3000/api/organizations/${organization.slug}/members/${memberUser._id}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: memberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not an admin', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: memberUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${adminUser._id}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: adminUser._id.toString(),
      }),
    })
    expect(response.status).toBe(403)
  })

  it('returns 404 when target user not found', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const fakeUserId = '507f1f77bcf86cd799439011'
    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${fakeUserId}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ slug: organization.slug, userId: fakeUserId }),
    })
    expect(response.status).toBe(404)
  })

  it('removes member from organization', async () => {
    const timestamp = Date.now()
    const tempMember = await User.create({
      username: `temp-member-${timestamp}`,
      email: `temp-member-${timestamp}@test.local`,
      passhash: 'hashedpassword',
      memberships: [
        {
          organizationId: organization._id,
          organizationSlug: organization.slug,
          role: 'member',
          approvedAt: new Date(),
        },
      ],
    })

    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const tempMemberId = tempMember._id.toString()
    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${tempMemberId}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: tempMemberId,
      }),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('removed')

    const updatedUser = await User.findById(tempMemberId)
    expect(updatedUser?.memberships).toHaveLength(0)

    await User.findByIdAndDelete(tempMemberId)
  })

  it('removes membership even if user was not a member (idempotent)', async () => {
    vi.mocked(getTokenServer).mockResolvedValue('token')
    vi.mocked(verifyAuthToken).mockResolvedValue({ email: adminUser.email })

    const request = new NextRequest(
      `http://localhost:3000/api/organizations/${organization.slug}/members/${nonMemberUser._id}`,
      { method: 'DELETE' }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({
        slug: organization.slug,
        userId: nonMemberUser._id.toString(),
      }),
    })
    expect(response.status).toBe(200)

    const updatedUser = await User.findById(nonMemberUser._id)
    expect(updatedUser?.memberships).toHaveLength(0)
  })
})
