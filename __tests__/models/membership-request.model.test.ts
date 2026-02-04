import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { getMasterConnection } from '@/lib/db/conn'

describe('Membership Request Model', () => {
  let testUser: mongoose.Types.ObjectId
  let testOrg: mongoose.Types.ObjectId

  beforeEach(async () => {
    await getMasterConnection()
    await MembershipRequest.deleteMany({})
    await Organization.deleteMany({})
    await User.deleteMany({})

    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passhash: 'hashedpassword',
    })
    testUser = user._id as mongoose.Types.ObjectId

    const org = await Organization.create({
      slug: 'testorg',
      name: 'Test Organization',
      createdBy: testUser,
      status: 'active',
    })
    testOrg = org._id as mongoose.Types.ObjectId
  })

  afterEach(async () => {
    await MembershipRequest.deleteMany({})
    await Organization.deleteMany({})
    await User.deleteMany({})
  })

  describe('schema validation', () => {
    it('creates email invite with required fields', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'invitee@example.com',
        invitedBy: testUser,
        role: 'member',
      })

      expect(invite.type).toBe('email')
      expect(invite.email).toBe('invitee@example.com')
      expect(invite.status).toBe('pending')
      expect(invite.role).toBe('member')
      expect(invite.maxUses).toBe(1)
      expect(invite.usedCount).toBe(0)
    })

    it('creates code invite with required fields', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'INVITE123',
        invitedBy: testUser,
        role: 'admin',
      })

      expect(invite.type).toBe('code')
      expect(invite.code).toBe('INVITE123')
      expect(invite.role).toBe('admin')
    })

    it('lowercases email automatically', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'UPPER@EXAMPLE.COM',
        invitedBy: testUser,
      })

      expect(invite.email).toBe('upper@example.com')
    })

    it('lowercases organizationSlug automatically', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'TESTORG',
        type: 'code',
        code: 'CODE123',
        invitedBy: testUser,
      })

      expect(invite.organizationSlug).toBe('testorg')
    })

    it('rejects invalid type', async () => {
      await expect(
        MembershipRequest.create({
          organizationId: testOrg,
          organizationSlug: 'testorg',
          type: 'invalid',
          invitedBy: testUser,
        } as unknown as Parameters<typeof MembershipRequest.create>[0])
      ).rejects.toThrow()
    })

    it('rejects invalid role', async () => {
      await expect(
        MembershipRequest.create({
          organizationId: testOrg,
          organizationSlug: 'testorg',
          type: 'email',
          email: 'test@example.com',
          invitedBy: testUser,
          role: 'superadmin',
        } as unknown as Parameters<typeof MembershipRequest.create>[0])
      ).rejects.toThrow()
    })

    it('rejects invalid status', async () => {
      await expect(
        MembershipRequest.create({
          organizationId: testOrg,
          organizationSlug: 'testorg',
          type: 'email',
          email: 'test@example.com',
          invitedBy: testUser,
          status: 'invalid',
        } as unknown as Parameters<typeof MembershipRequest.create>[0])
      ).rejects.toThrow()
    })
  })

  describe('findValidByCode static method', () => {
    it('finds valid pending code invite', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'VALIDCODE',
        invitedBy: testUser,
      })

      const found = await MembershipRequest.findValidByCode('VALIDCODE')
      expect(found).toBeDefined()
      expect(found?.code).toBe('VALIDCODE')
    })

    it('returns null for non-existent code', async () => {
      const found = await MembershipRequest.findValidByCode('NONEXISTENT')
      expect(found).toBeNull()
    })

    it('returns null for expired invite', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'EXPIRED',
        invitedBy: testUser,
        expiresAt: new Date(Date.now() - 1000),
      })

      const found = await MembershipRequest.findValidByCode('EXPIRED')
      expect(found).toBeNull()
    })

    it('returns null for accepted invite', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'ACCEPTED',
        invitedBy: testUser,
        status: 'accepted',
      })

      const found = await MembershipRequest.findValidByCode('ACCEPTED')
      expect(found).toBeNull()
    })

    it('returns null when maxUses reached', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'MAXUSED',
        invitedBy: testUser,
        maxUses: 2,
        usedCount: 2,
      })

      const found = await MembershipRequest.findValidByCode('MAXUSED')
      expect(found).toBeNull()
    })

    it('finds invite when usedCount < maxUses', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'PARTIAL',
        invitedBy: testUser,
        maxUses: 3,
        usedCount: 2,
      })

      const found = await MembershipRequest.findValidByCode('PARTIAL')
      expect(found).toBeDefined()
    })

    it('finds invite with no expiration', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'NOEXPIRE',
        invitedBy: testUser,
      })

      const found = await MembershipRequest.findValidByCode('NOEXPIRE')
      expect(found).toBeDefined()
    })

    it('finds invite with future expiration', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'FUTURE',
        invitedBy: testUser,
        expiresAt: new Date(Date.now() + 86400000),
      })

      const found = await MembershipRequest.findValidByCode('FUTURE')
      expect(found).toBeDefined()
    })
  })

  describe('findValidByEmail static method', () => {
    it('finds valid pending email invite', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'valid@example.com',
        invitedBy: testUser,
      })

      const found = await MembershipRequest.findValidByEmail(
        'valid@example.com',
        testOrg
      )
      expect(found).toBeDefined()
      expect(found?.email).toBe('valid@example.com')
    })

    it('finds email invite case-insensitively', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'case@example.com',
        invitedBy: testUser,
      })

      const found = await MembershipRequest.findValidByEmail(
        'CASE@EXAMPLE.COM',
        testOrg
      )
      expect(found).toBeDefined()
    })

    it('returns null for wrong organization', async () => {
      const otherOrg = await Organization.create({
        slug: 'otherorg',
        name: 'Other Org',
        createdBy: testUser,
        status: 'active',
      })

      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'wrongorg@example.com',
        invitedBy: testUser,
      })

      const found = await MembershipRequest.findValidByEmail(
        'wrongorg@example.com',
        otherOrg._id as mongoose.Types.ObjectId
      )
      expect(found).toBeNull()
    })

    it('returns null for expired email invite', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'expired@example.com',
        invitedBy: testUser,
        expiresAt: new Date(Date.now() - 1000),
      })

      const found = await MembershipRequest.findValidByEmail(
        'expired@example.com',
        testOrg
      )
      expect(found).toBeNull()
    })

    it('returns null for accepted email invite', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'accepted@example.com',
        invitedBy: testUser,
        status: 'accepted',
      })

      const found = await MembershipRequest.findValidByEmail(
        'accepted@example.com',
        testOrg
      )
      expect(found).toBeNull()
    })
  })

  describe('invite workflow', () => {
    it('tracks acceptance of invite', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'accept@example.com',
        invitedBy: testUser,
      })

      invite.status = 'accepted'
      invite.acceptedBy = testUser
      invite.acceptedAt = new Date()
      await invite.save()

      const updated = await MembershipRequest.findById(invite._id)
      expect(updated?.status).toBe('accepted')
      expect(updated?.acceptedBy).toBeDefined()
      expect(updated?.acceptedAt).toBeDefined()
    })

    it('tracks usedCount increment for code invites', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'MULTIUSE',
        invitedBy: testUser,
        maxUses: 5,
        usedCount: 0,
      })

      invite.usedCount += 1
      await invite.save()

      const updated = await MembershipRequest.findById(invite._id)
      expect(updated?.usedCount).toBe(1)
    })

    it('can cancel pending invite', async () => {
      const invite = await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'cancel@example.com',
        invitedBy: testUser,
      })

      invite.status = 'cancelled'
      await invite.save()

      const found = await MembershipRequest.findValidByEmail(
        'cancel@example.com',
        testOrg
      )
      expect(found).toBeNull()
    })
  })

  describe('indexes', () => {
    it('has compound index on organizationId and status', () => {
      const indexes = MembershipRequest.schema.indexes()
      const hasIndex = indexes.some(
        (idx) =>
          idx[0].organizationId !== undefined && idx[0].status !== undefined
      )
      expect(hasIndex).toBe(true)
    })

    it('has unique sparse index on code', () => {
      const indexes = MembershipRequest.schema.indexes()
      const hasCodeIndex = indexes.some(
        (idx) => idx[0].code !== undefined && idx[1]?.sparse && idx[1]?.unique
      )
      expect(hasCodeIndex).toBe(true)
    })

    it('prevents duplicate codes', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'code',
        code: 'UNIQUE',
        invitedBy: testUser,
      })

      await expect(
        MembershipRequest.create({
          organizationId: testOrg,
          organizationSlug: 'testorg',
          type: 'code',
          code: 'UNIQUE',
          invitedBy: testUser,
        })
      ).rejects.toThrow()
    })

    it('allows multiple invites without codes', async () => {
      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'email1@example.com',
        invitedBy: testUser,
      })

      await MembershipRequest.create({
        organizationId: testOrg,
        organizationSlug: 'testorg',
        type: 'email',
        email: 'email2@example.com',
        invitedBy: testUser,
      })

      const count = await MembershipRequest.countDocuments({
        type: 'email',
        organizationId: testOrg,
      })
      expect(count).toBe(2)
    })
  })
})
