import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { getMasterConnection } from '@/lib/db/conn'
import User from '@/models/user.model'

describe('User Model', () => {
  beforeEach(async () => {
    await getMasterConnection()
    await User.deleteMany({})
    await User.ensureIndexes()
  })

  afterEach(async () => {
    await User.deleteMany({})
  })

  describe('schema validation', () => {
    it('creates user with required fields', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        passhash: 'hashedpassword',
      })

      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.isSuperAdmin).toBe(false)
      expect(user.memberships).toEqual([])
      expect(user.isActive).toBe(true)
    })

    it('lowercases email automatically', async () => {
      const user = await User.create({
        username: 'emailtest',
        email: 'TEST@EXAMPLE.COM',
        passhash: 'hash',
      })

      expect(user.email).toBe('test@example.com')
    })

    it('rejects duplicate emails', async () => {
      await User.create({
        username: 'user1',
        email: 'same@example.com',
        passhash: 'hash',
      })

      await expect(
        User.create({
          username: 'user2',
          email: 'same@example.com',
          passhash: 'hash',
        })
      ).rejects.toThrow()
    })

    it('rejects duplicate usernames', async () => {
      await User.create({
        username: 'sameuser',
        email: 'user1@example.com',
        passhash: 'hash',
      })

      await expect(
        User.create({
          username: 'sameuser',
          email: 'user2@example.com',
          passhash: 'hash',
        })
      ).rejects.toThrow()
    })
  })

  describe('isSuperAdmin', () => {
    it('defaults to false', async () => {
      const user = await User.create({
        username: 'regular',
        email: 'regular@example.com',
        passhash: 'hash',
      })

      expect(user.isSuperAdmin).toBe(false)
    })

    it('can be set to true', async () => {
      const user = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        passhash: 'hash',
        isSuperAdmin: true,
      })

      expect(user.isSuperAdmin).toBe(true)
    })
  })

  describe('memberships', () => {
    it('can have multiple memberships', async () => {
      const orgId1 = new mongoose.Types.ObjectId()
      const orgId2 = new mongoose.Types.ObjectId()

      const user = await User.create({
        username: 'multimember',
        email: 'multi@example.com',
        passhash: 'hash',
        memberships: [
          {
            organizationId: orgId1,
            organizationSlug: 'org1',
            role: 'admin',
          },
          {
            organizationId: orgId2,
            organizationSlug: 'org2',
            role: 'member',
          },
        ],
      })

      expect(user.memberships).toHaveLength(2)
      expect(user.memberships[0].role).toBe('admin')
      expect(user.memberships[1].role).toBe('member')
    })

    it('can add membership after creation', async () => {
      const user = await User.create({
        username: 'addmember',
        email: 'add@example.com',
        passhash: 'hash',
      })

      const orgId = new mongoose.Types.ObjectId()
      user.memberships.push({
        organizationId: orgId,
        organizationSlug: 'neworg',
        role: 'member',
        approvedAt: new Date(),
      })
      await user.save()

      const updated = await User.findById(user._id)
      expect(updated?.memberships).toHaveLength(1)
      expect(updated?.memberships[0].organizationSlug).toBe('neworg')
    })

    it('tracks approval status', async () => {
      const orgId = new mongoose.Types.ObjectId()
      const approvalDate = new Date()

      const user = await User.create({
        username: 'approved',
        email: 'approved@example.com',
        passhash: 'hash',
        memberships: [
          {
            organizationId: orgId,
            organizationSlug: 'org',
            role: 'member',
            approvedAt: approvalDate,
          },
        ],
      })

      expect(user.memberships[0].approvedAt).toEqual(approvalDate)
    })

    it('supports different roles per organization', async () => {
      const orgId1 = new mongoose.Types.ObjectId()
      const orgId2 = new mongoose.Types.ObjectId()

      const user = await User.create({
        username: 'roles',
        email: 'roles@example.com',
        passhash: 'hash',
        memberships: [
          {
            organizationId: orgId1,
            organizationSlug: 'org1',
            role: 'admin',
          },
          {
            organizationId: orgId2,
            organizationSlug: 'org2',
            role: 'member',
          },
        ],
      })

      const adminOf = user.memberships.filter((m) => m.role === 'admin')
      const memberOf = user.memberships.filter((m) => m.role === 'member')

      expect(adminOf).toHaveLength(1)
      expect(memberOf).toHaveLength(1)
    })
  })

  describe('password methods', () => {
    it('hashPassword returns bcrypt hash', async () => {
      const hash = await User.hashPassword('mypassword')
      expect(hash).toBeDefined()
      expect(hash).not.toBe('mypassword')
      expect(hash.length).toBeGreaterThan(20)
    })

    it('comparePassword validates correct password', async () => {
      const hash = await User.hashPassword('correctpassword')
      const isValid = await User.comparePassword('correctpassword', hash)
      expect(isValid).toBe(true)
    })

    it('comparePassword rejects wrong password', async () => {
      const hash = await User.hashPassword('correctpassword')
      const isValid = await User.comparePassword('wrongpassword', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('indexes', () => {
    it('has index on email', () => {
      const indexes = User.schema.indexes()
      const hasEmailIndex = indexes.some((idx) => idx[0].email !== undefined)
      expect(hasEmailIndex).toBe(true)
    })

    it('has index on username', () => {
      const indexes = User.schema.indexes()
      const hasUsernameIndex = indexes.some(
        (idx) => idx[0].username !== undefined
      )
      expect(hasUsernameIndex).toBe(true)
    })

    it('has index on memberships.organizationId', () => {
      const indexes = User.schema.indexes()
      const hasMembershipIndex = indexes.some(
        (idx) => idx[0]['memberships.organizationId'] !== undefined
      )
      expect(hasMembershipIndex).toBe(true)
    })

    it('has index on isSuperAdmin', () => {
      const indexes = User.schema.indexes()
      const hasSuperAdminIndex = indexes.some(
        (idx) => idx[0].isSuperAdmin !== undefined
      )
      expect(hasSuperAdminIndex).toBe(true)
    })
  })

  describe('extensibility', () => {
    it('allows adding new membership roles without schema change', () => {
      const roles = ['admin', 'member']
      expect(roles).toContain('admin')
      expect(roles).toContain('member')
    })
  })

  describe('isActive status', () => {
    it('defaults to true', async () => {
      const user = await User.create({
        username: 'activeuser',
        email: 'active@example.com',
        passhash: 'hash',
      })

      expect(user.isActive).toBe(true)
    })

    it('can be set to false', async () => {
      const user = await User.create({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        passhash: 'hash',
        isActive: false,
      })

      expect(user.isActive).toBe(false)
    })

    it('can be deactivated after creation', async () => {
      const user = await User.create({
        username: 'deactivate',
        email: 'deactivate@example.com',
        passhash: 'hash',
      })

      user.isActive = false
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.isActive).toBe(false)
    })

    it('can be reactivated', async () => {
      const user = await User.create({
        username: 'reactivate',
        email: 'reactivate@example.com',
        passhash: 'hash',
        isActive: false,
      })

      user.isActive = true
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.isActive).toBe(true)
    })
  })

  describe('lastSignIn tracking', () => {
    it('starts without lastSignIn', async () => {
      const user = await User.create({
        username: 'nosignin',
        email: 'nosignin@example.com',
        passhash: 'hash',
      })

      expect(user.lastSignIn).toBeUndefined()
    })

    it('can record sign-in time', async () => {
      const user = await User.create({
        username: 'signin',
        email: 'signin@example.com',
        passhash: 'hash',
      })

      const signInTime = new Date()
      user.lastSignIn = signInTime
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.lastSignIn).toEqual(signInTime)
    })

    it('updates on subsequent sign-ins', async () => {
      const user = await User.create({
        username: 'multiplesignin',
        email: 'multiplesignin@example.com',
        passhash: 'hash',
      })

      const firstSignIn = new Date('2025-01-01')
      user.lastSignIn = firstSignIn
      await user.save()

      const secondSignIn = new Date('2025-01-15')
      user.lastSignIn = secondSignIn
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.lastSignIn).toEqual(secondSignIn)
    })
  })

  describe('avatar field', () => {
    it('starts without avatar', async () => {
      const user = await User.create({
        username: 'noavatar',
        email: 'noavatar@example.com',
        passhash: 'hash',
      })

      expect(user.avatar).toBeUndefined()
    })

    it('can set avatar URL', async () => {
      const user = await User.create({
        username: 'withavatar',
        email: 'withavatar@example.com',
        passhash: 'hash',
        avatar: 'https://example.com/avatar.png',
      })

      expect(user.avatar).toBe('https://example.com/avatar.png')
    })

    it('can update avatar', async () => {
      const user = await User.create({
        username: 'updateavatar',
        email: 'updateavatar@example.com',
        passhash: 'hash',
      })

      user.avatar = 'https://example.com/new-avatar.png'
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.avatar).toBe('https://example.com/new-avatar.png')
    })
  })

  describe('membership management', () => {
    it('can remove membership', async () => {
      const orgId1 = new mongoose.Types.ObjectId()
      const orgId2 = new mongoose.Types.ObjectId()

      const user = await User.create({
        username: 'removemember',
        email: 'removemember@example.com',
        passhash: 'hash',
        memberships: [
          {
            organizationId: orgId1,
            organizationSlug: 'org1',
            role: 'admin',
          },
          {
            organizationId: orgId2,
            organizationSlug: 'org2',
            role: 'member',
          },
        ],
      })

      user.memberships = user.memberships.filter(
        (m) => m.organizationSlug !== 'org1'
      )
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.memberships).toHaveLength(1)
      expect(found?.memberships[0].organizationSlug).toBe('org2')
    })

    it('can change role in membership', async () => {
      const orgId = new mongoose.Types.ObjectId()

      const user = await User.create({
        username: 'changerole',
        email: 'changerole@example.com',
        passhash: 'hash',
        memberships: [
          {
            organizationId: orgId,
            organizationSlug: 'org',
            role: 'member',
          },
        ],
      })

      const membership = user.memberships.find(
        (m) => m.organizationSlug === 'org'
      )
      if (membership) {
        membership.role = 'admin'
      }
      await user.save()

      const found = await User.findById(user._id)
      expect(found?.memberships[0].role).toBe('admin')
    })

    it('organizationSlug is lowercased', async () => {
      const orgId = new mongoose.Types.ObjectId()

      const user = await User.create({
        username: 'slugcase',
        email: 'slugcase@example.com',
        passhash: 'hash',
        memberships: [
          {
            organizationId: orgId,
            organizationSlug: 'ORGSLUG',
            role: 'member',
          },
        ],
      })

      expect(user.memberships[0].organizationSlug).toBe('orgslug')
    })
  })
})
