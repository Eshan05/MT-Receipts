import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import Organization, {
  RESERVED_SLUGS,
  isSlugReserved,
} from '@/models/organization.model'
import User from '@/models/user.model'
import { getMasterConnection } from '@/lib/db/conn'

describe('Organization Model', () => {
  let testUser: mongoose.Types.ObjectId

  beforeEach(async () => {
    await getMasterConnection()
    await Organization.deleteMany({})
    await User.deleteMany({})

    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passhash: 'hashedpassword',
    })
    testUser = user._id as mongoose.Types.ObjectId
  })

  afterEach(async () => {
    await Organization.deleteMany({})
    await User.deleteMany({})
  })

  describe('schema validation', () => {
    it('creates organization with required fields', async () => {
      const org = await Organization.create({
        slug: 'testorg',
        name: 'Test Organization',
        createdBy: testUser,
      })

      expect(org.slug).toBe('testorg')
      expect(org.name).toBe('Test Organization')
      expect(org.status).toBe('pending')
      expect(org.limits.maxEvents).toBe(-1)
      expect(org.limits.maxReceiptsPerMonth).toBe(-1)
      expect(org.limits.maxUsers).toBe(-1)
    })

    it('lowercases slug automatically', async () => {
      const org = await Organization.create({
        slug: 'TESTORG',
        name: 'Test',
        createdBy: testUser,
      })

      expect(org.slug).toBe('testorg')
    })

    it('rejects slug shorter than 3 characters', async () => {
      await expect(
        Organization.create({
          slug: 'ab',
          name: 'Test',
          createdBy: testUser,
        })
      ).rejects.toThrow()
    })

    it('rejects slug longer than 20 characters', async () => {
      await expect(
        Organization.create({
          slug: 'this-is-a-very-long-slug',
          name: 'Test',
          createdBy: testUser,
        })
      ).rejects.toThrow()
    })

    it('rejects duplicate slugs', async () => {
      await Organization.create({
        slug: 'unique',
        name: 'First',
        createdBy: testUser,
      })

      await expect(
        Organization.create({
          slug: 'unique',
          name: 'Second',
          createdBy: testUser,
        })
      ).rejects.toThrow()
    })
  })

  describe('status transitions', () => {
    it('starts with pending status', async () => {
      const org = await Organization.create({
        slug: 'pending-test',
        name: 'Test',
        createdBy: testUser,
      })

      expect(org.status).toBe('pending')
      expect(org.approvedAt).toBeUndefined()
    })

    it('can be approved', async () => {
      const org = await Organization.create({
        slug: 'approve-test',
        name: 'Test',
        createdBy: testUser,
      })

      org.status = 'active'
      org.approvedAt = new Date()
      org.approvedBy = testUser
      await org.save()

      expect(org.status).toBe('active')
      expect(org.approvedAt).toBeDefined()
    })

    it('can be suspended', async () => {
      const org = await Organization.create({
        slug: 'suspend-test',
        name: 'Test',
        createdBy: testUser,
        status: 'active',
      })

      org.status = 'suspended'
      await org.save()

      expect(org.status).toBe('suspended')
    })

    it('can be soft deleted with restoration window', async () => {
      const org = await Organization.create({
        slug: 'delete-test',
        name: 'Test',
        createdBy: testUser,
        status: 'active',
      })

      const deletedAt = new Date()
      const restoresBefore = new Date(
        deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000
      )

      org.status = 'deleted'
      org.deletedAt = deletedAt
      org.restoresBefore = restoresBefore
      await org.save()

      expect(org.status).toBe('deleted')
      expect(org.deletedAt).toBeDefined()
      expect(org.restoresBefore).toBeDefined()
    })
  })

  describe('approval workflow', () => {
    it('tracks approval timestamp and approver', async () => {
      const org = await Organization.create({
        slug: 'approval-tracking',
        name: 'Test',
        createdBy: testUser,
        status: 'pending',
      })

      const approvalTime = new Date()
      org.status = 'active'
      org.approvedAt = approvalTime
      org.approvedBy = testUser
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.approvedAt).toEqual(approvalTime)
      expect(found?.approvedBy?.toString()).toBe(testUser.toString())
    })

    it('can transition from pending to active', async () => {
      const org = await Organization.create({
        slug: 'pending-to-active',
        name: 'Test',
        createdBy: testUser,
        status: 'pending',
      })

      org.status = 'active'
      org.approvedAt = new Date()
      org.approvedBy = testUser
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.status).toBe('active')
    })

    it('can transition from active to suspended', async () => {
      const org = await Organization.create({
        slug: 'active-to-suspended',
        name: 'Test',
        createdBy: testUser,
        status: 'active',
      })

      org.status = 'suspended'
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.status).toBe('suspended')
    })

    it('can transition from suspended back to active', async () => {
      const org = await Organization.create({
        slug: 'suspended-to-active',
        name: 'Test',
        createdBy: testUser,
        status: 'suspended',
      })

      org.status = 'active'
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.status).toBe('active')
    })
  })

  describe('soft delete and restore workflow', () => {
    it('sets 30-day restoration window on delete', async () => {
      const org = await Organization.create({
        slug: 'delete-window',
        name: 'Test',
        createdBy: testUser,
        status: 'active',
      })

      const now = new Date()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000

      org.status = 'deleted'
      org.deletedAt = now
      org.restoresBefore = new Date(now.getTime() + thirtyDays)
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.restoresBefore).toBeDefined()
      expect(found?.restoresBefore?.getTime()! - now.getTime()).toBe(thirtyDays)
    })

    it('can be restored within restoration window', async () => {
      const org = await Organization.create({
        slug: 'restore-test',
        name: 'Test',
        createdBy: testUser,
        status: 'deleted',
        deletedAt: new Date(),
        restoresBefore: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      org.status = 'active'
      org.deletedAt = undefined
      org.restoresBefore = undefined
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.status).toBe('active')
      expect(found?.deletedAt).toBeUndefined()
      expect(found?.restoresBefore).toBeUndefined()
    })

    it('preserves data after restore', async () => {
      const org = await Organization.create({
        slug: 'preserve-data',
        name: 'Original Name',
        createdBy: testUser,
        status: 'active',
        settings: {
          primaryColor: '#ff0000',
          organizationName: 'Custom Name',
        },
      })

      org.status = 'deleted'
      org.deletedAt = new Date()
      org.restoresBefore = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await org.save()

      org.status = 'active'
      org.deletedAt = undefined
      org.restoresBefore = undefined
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.name).toBe('Original Name')
      expect(found?.settings.primaryColor).toBe('#ff0000')
      expect(found?.settings.organizationName).toBe('Custom Name')
    })
  })

  describe('limits', () => {
    it('defaults to unlimited (-1) for all limits', async () => {
      const org = await Organization.create({
        slug: 'default-limits',
        name: 'Test',
        createdBy: testUser,
      })

      expect(org.limits.maxEvents).toBe(-1)
      expect(org.limits.maxReceiptsPerMonth).toBe(-1)
      expect(org.limits.maxUsers).toBe(-1)
    })

    it('can set custom limits', async () => {
      const org = await Organization.create({
        slug: 'custom-limits',
        name: 'Test',
        createdBy: testUser,
        limits: {
          maxEvents: 10,
          maxReceiptsPerMonth: 100,
          maxUsers: 5,
        },
      })

      expect(org.limits.maxEvents).toBe(10)
      expect(org.limits.maxReceiptsPerMonth).toBe(100)
      expect(org.limits.maxUsers).toBe(5)
    })

    it('can update limits after creation', async () => {
      const org = await Organization.create({
        slug: 'update-limits',
        name: 'Test',
        createdBy: testUser,
      })

      org.limits.maxEvents = 50
      org.limits.maxReceiptsPerMonth = 500
      await org.save()

      const found = await Organization.findById(org._id)
      expect(found?.limits.maxEvents).toBe(50)
      expect(found?.limits.maxReceiptsPerMonth).toBe(500)
    })

    it('supports zero limits (disable feature)', async () => {
      const org = await Organization.create({
        slug: 'zero-limits',
        name: 'Test',
        createdBy: testUser,
        limits: {
          maxEvents: 0,
          maxReceiptsPerMonth: 0,
          maxUsers: 0,
        },
      })

      expect(org.limits.maxEvents).toBe(0)
      expect(org.limits.maxReceiptsPerMonth).toBe(0)
      expect(org.limits.maxUsers).toBe(0)
    })
  })

  describe('settings', () => {
    it('uses default settings', async () => {
      const org = await Organization.create({
        slug: 'settings-test',
        name: 'Test',
        createdBy: testUser,
      })

      expect(org.settings.primaryColor).toBe('#3b82f6')
      expect(org.settings.receiptNumberFormat).toBe(
        'RCP-{eventCode}-{initials}{seq}'
      )
    })

    it('allows custom settings', async () => {
      const org = await Organization.create({
        slug: 'custom-settings',
        name: 'Test',
        createdBy: testUser,
        settings: {
          primaryColor: '#ff0000',
          organizationName: 'Custom Org',
          receiptNumberFormat: 'CUSTOM-{seq}',
        },
      })

      expect(org.settings.primaryColor).toBe('#ff0000')
      expect(org.settings.organizationName).toBe('Custom Org')
      expect(org.settings.receiptNumberFormat).toBe('CUSTOM-{seq}')
    })
  })

  describe('static methods', () => {
    it('findBySlug finds organization by slug', async () => {
      await Organization.create({
        slug: 'find-me',
        name: 'Test',
        createdBy: testUser,
      })

      const found = await Organization.findBySlug('find-me')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test')
    })

    it('findActive returns only active organizations', async () => {
      await Organization.create({
        slug: 'active1',
        name: 'Active 1',
        createdBy: testUser,
        status: 'active',
      })
      await Organization.create({
        slug: 'pending1',
        name: 'Pending',
        createdBy: testUser,
        status: 'pending',
      })

      const active = await Organization.findActive()
      expect(active.length).toBe(1)
      expect(active[0].slug).toBe('active1')
    })

    it('findDeleted returns only deleted organizations', async () => {
      await Organization.create({
        slug: 'deleted1',
        name: 'Deleted',
        createdBy: testUser,
        status: 'deleted',
        deletedAt: new Date(),
      })
      await Organization.create({
        slug: 'active2',
        name: 'Active',
        createdBy: testUser,
        status: 'active',
      })

      const deleted = await Organization.findDeleted()
      expect(deleted.length).toBe(1)
      expect(deleted[0].slug).toBe('deleted1')
    })
  })

  describe('reserved slugs', () => {
    it('contains expected reserved slugs', () => {
      expect(RESERVED_SLUGS).toContain('api')
      expect(RESERVED_SLUGS).toContain('admin')
      expect(RESERVED_SLUGS).toContain('login')
      expect(RESERVED_SLUGS).toContain('superadmin')
    })

    it('isSlugReserved identifies reserved slugs', () => {
      expect(isSlugReserved('api')).toBe(true)
      expect(isSlugReserved('login')).toBe(true)
      expect(isSlugReserved('myorg')).toBe(false)
    })

    it('isSlugReserved is case-insensitive', () => {
      expect(isSlugReserved('API')).toBe(true)
      expect(isSlugReserved('Login')).toBe(true)
    })
  })

  describe('indexes', () => {
    it('has index on status', async () => {
      const indexes = Organization.schema.indexes()
      const hasStatusIndex = indexes.some((idx) => idx[0].status !== undefined)
      expect(hasStatusIndex).toBe(true)
    })

    it('has index on createdAt', async () => {
      const indexes = Organization.schema.indexes()
      const hasCreatedAtIndex = indexes.some(
        (idx) => idx[0].createdAt !== undefined
      )
      expect(hasCreatedAtIndex).toBe(true)
    })
  })
})
