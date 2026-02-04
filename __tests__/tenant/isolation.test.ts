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
import mongoose from 'mongoose'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { getTenantModels, type TenantModels } from '@/lib/db/tenant-models'
import {
  setCachedOrganization,
  invalidateCachedOrganization,
} from '@/lib/redis'
import { getTenantContext } from '@/lib/tenant-route'
import type { IUser } from '@/models/user.model'
import type { IOrganization } from '@/models/organization.model'

import { getTokenServer, verifyAuthToken } from '@/lib/auth'

const SKIP_MONGODB_SETUP = process.env.SKIP_MONGODB_SETUP === 'true'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    getTokenServer: vi.fn(),
    verifyAuthToken: vi.fn(),
  }
})

describe.skipIf(SKIP_MONGODB_SETUP)(
  'Phase 7: Tenant Database Isolation',
  () => {
    let adminUser: IUser & { _id: mongoose.Types.ObjectId }
    let memberUser: IUser & { _id: mongoose.Types.ObjectId }
    let org1: IOrganization & { _id: mongoose.Types.ObjectId }
    let org2: IOrganization & { _id: mongoose.Types.ObjectId }

    beforeAll(async () => {
      await dbConnect()
      const timestamp = Date.now()

      const createdAdmin = await User.create({
        username: `p7-admin-${timestamp}`,
        email: `p7-admin-${timestamp}@test.local`,
        passhash: 'hashedpassword',
        memberships: [],
      })
      adminUser = createdAdmin as IUser & { _id: mongoose.Types.ObjectId }

      const createdMember = await User.create({
        username: `p7-member-${timestamp}`,
        email: `p7-member-${timestamp}@test.local`,
        passhash: 'hashedpassword',
        memberships: [],
      })
      memberUser = createdMember as IUser & { _id: mongoose.Types.ObjectId }

      const createdOrg1 = await Organization.create({
        name: 'Test Org 1',
        slug: `testorg1${timestamp}`.slice(0, 15),
        status: 'active',
        createdBy: adminUser._id,
      })
      org1 = createdOrg1 as IOrganization & { _id: mongoose.Types.ObjectId }

      const createdOrg2 = await Organization.create({
        name: 'Test Org 2',
        slug: `testorg2${timestamp}`.slice(0, 15),
        status: 'active',
        createdBy: adminUser._id,
      })
      org2 = createdOrg2 as IOrganization & { _id: mongoose.Types.ObjectId }

      adminUser.memberships.push(
        {
          organizationId: org1._id,
          organizationSlug: org1.slug,
          role: 'admin',
          approvedAt: new Date(),
        },
        {
          organizationId: org2._id,
          organizationSlug: org2.slug,
          role: 'admin',
          approvedAt: new Date(),
        }
      )
      await adminUser.save()

      memberUser.memberships.push({
        organizationId: org1._id,
        organizationSlug: org1.slug,
        role: 'member',
        approvedAt: new Date(),
      })
      await memberUser.save()

      await setCachedOrganization(org1.slug, {
        id: org1._id.toString(),
        slug: org1.slug,
        name: org1.name,
        status: org1.status,
      })

      await setCachedOrganization(org2.slug, {
        id: org2._id.toString(),
        slug: org2.slug,
        name: org2.name,
        status: org2.status,
      })
    })

    afterAll(async () => {
      const models1: TenantModels = await getTenantModels(org1.slug)
      const models2: TenantModels = await getTenantModels(org2.slug)

      await models1.Event.deleteMany({})
      await models1.Receipt.deleteMany({})
      await models1.Template.deleteMany({})
      await models1.Sequence.deleteMany({})

      await models2.Event.deleteMany({})
      await models2.Receipt.deleteMany({})
      await models2.Template.deleteMany({})
      await models2.Sequence.deleteMany({})

      await invalidateCachedOrganization(org1.slug)
      await invalidateCachedOrganization(org2.slug)

      await Organization.findByIdAndDelete(org1._id)
      await Organization.findByIdAndDelete(org2._id)
      await User.findByIdAndDelete(adminUser._id)
      await User.findByIdAndDelete(memberUser._id)
    })

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('getTenantContext', () => {
      it('returns error when not authenticated', async () => {
        vi.mocked(getTokenServer).mockResolvedValue(undefined)
        const result = await getTenantContext()
        expect(result).toBeInstanceOf(Response)
      })
    })

    describe('getTenantModels', () => {
      it('creates models for valid organization slug', async () => {
        const models: TenantModels = await getTenantModels(org1.slug)
        expect(models.Event).toBeDefined()
        expect(models.Receipt).toBeDefined()
        expect(models.Template).toBeDefined()
        expect(models.Sequence).toBeDefined()
      })
    })

    describe('Event isolation', () => {
      beforeEach(async () => {
        const models1: TenantModels = await getTenantModels(org1.slug)
        const models2: TenantModels = await getTenantModels(org2.slug)
        await models1.Event.deleteMany({})
        await models2.Event.deleteMany({})
      })

      it('stores event in correct tenant database', async () => {
        const models: TenantModels = await getTenantModels(org1.slug)
        const event = await models.Event.create({
          eventCode: 'EV1',
          type: 'seminar',
          name: 'Test Event',
          items: [{ name: 'Item', description: 'Desc', price: 100 }],
          isActive: true,
        })
        expect(event._id).toBeDefined()
        const found = await models.Event.findByEventCode('EV1')
        expect(found).toBeDefined()
        expect(found?.name).toBe('Test Event')
      })

      it('events are isolated between tenants', async () => {
        const models1: TenantModels = await getTenantModels(org1.slug)
        const models2: TenantModels = await getTenantModels(org2.slug)

        await models1.Event.create({
          eventCode: 'ORG1EV',
          type: 'seminar',
          name: 'Org 1 Event',
          items: [],
          isActive: true,
        })
        await models2.Event.create({
          eventCode: 'ORG2EV',
          type: 'workshop',
          name: 'Org 2 Event',
          items: [],
          isActive: true,
        })

        const org1Events = await models1.Event.find()
        const org2Events = await models2.Event.find()

        expect(org1Events).toHaveLength(1)
        expect(org1Events[0].eventCode).toBe('ORG1EV')
        expect(org2Events).toHaveLength(1)
        expect(org2Events[0].eventCode).toBe('ORG2EV')
      })
    })

    describe('Receipt isolation', () => {
      it('receipts are isolated between tenants', async () => {
        const models1: TenantModels = await getTenantModels(org1.slug)
        const models2: TenantModels = await getTenantModels(org2.slug)

        const event1 = await models1.Event.create({
          eventCode: 'RCP1EV',
          type: 'seminar',
          name: 'Receipt Event 1',
          items: [],
          isActive: true,
        })

        const event2 = await models2.Event.create({
          eventCode: 'RCP2EV',
          type: 'workshop',
          name: 'Receipt Event 2',
          items: [],
          isActive: true,
        })

        await models1.Receipt.create({
          receiptNumber: 'RCP-ORG1-001',
          event: event1._id,
          customer: { name: 'Customer 1', email: 'c1@test.com' },
          items: [],
          totalAmount: 100,
        })

        await models2.Receipt.create({
          receiptNumber: 'RCP-ORG2-001',
          event: event2._id,
          customer: { name: 'Customer 2', email: 'c2@test.com' },
          items: [],
          totalAmount: 200,
        })

        const org1Receipts = await models1.Receipt.find()
        const org2Receipts = await models2.Receipt.find()

        expect(org1Receipts).toHaveLength(1)
        expect(org1Receipts[0].receiptNumber).toBe('RCP-ORG1-001')

        expect(org2Receipts).toHaveLength(1)
        expect(org2Receipts[0].receiptNumber).toBe('RCP-ORG2-001')
      })
    })
  }
)
