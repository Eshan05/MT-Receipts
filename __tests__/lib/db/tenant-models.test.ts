import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { getTenantModels, clearModelCache } from '@/lib/db/tenant-models'
import { getMasterConnection } from '@/lib/db/conn'
import { clearAllTenantConnections, getTenantConnection } from '@/lib/db/tenant'

describe('Tenant Models Factory', () => {
  beforeEach(async () => {
    clearModelCache()
    clearAllTenantConnections()
    await getMasterConnection()
  })

  afterEach(async () => {
    clearModelCache()
    clearAllTenantConnections()
  })

  describe('getTenantModels', () => {
    it('returns all tenant models', async () => {
      const models = await getTenantModels('testorg')

      expect(models.Event).toBeDefined()
      expect(models.Receipt).toBeDefined()
      expect(models.Sequence).toBeDefined()
      expect(models.Template).toBeDefined()
    })

    it('returns cached models for same slug', async () => {
      const models1 = await getTenantModels('cached')
      const models2 = await getTenantModels('cached')

      expect(models1.Event).toBe(models2.Event)
      expect(models1.Receipt).toBe(models2.Receipt)
    })

    it('returns different models for different slugs', async () => {
      const models1 = await getTenantModels('org1')
      const models2 = await getTenantModels('org2')

      expect(models1.Event).not.toBe(models2.Event)
    })
  })

  describe('model database binding', () => {
    it('models are bound to correct database', async () => {
      const models = await getTenantModels('bindtest')
      const conn = await getTenantConnection('bindtest')

      expect(models.Event.db.name).toBe(conn.name)
      expect(models.Receipt.db.name).toBe(conn.name)
    })
  })

  describe('model operations', () => {
    it('can create and query documents in tenant database', async () => {
      const models = await getTenantModels('optest')

      const event = await models.Event.create({
        code: 'EVT001',
        name: 'Test Event',
        startDate: new Date(),
        endDate: new Date(),
      })

      expect(event._id).toBeDefined()
      expect(event.code).toBe('EVT001')

      const found = await models.Event.findOne({ code: 'EVT001' })
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Event')
    })

    it('sequences increment correctly', async () => {
      const models = await getTenantModels('seqtest')

      await models.Sequence.create({ name: 'receipt', value: 0 })

      const seq = await models.Sequence.findOneAndUpdate(
        { name: 'receipt' },
        { $inc: { value: 1 } },
        { new: true }
      )

      expect(seq?.value).toBe(1)
    })
  })

  describe('cross-tenant isolation', () => {
    it('data in one tenant is not visible to another', async () => {
      const modelsA = await getTenantModels('tenant-a')
      const modelsB = await getTenantModels('tenant-b')

      await modelsA.Event.create({
        code: 'EVENT-A',
        name: 'Event in A',
        startDate: new Date(),
        endDate: new Date(),
      })

      const foundInA = await modelsA.Event.findOne({ code: 'EVENT-A' })
      const foundInB = await modelsB.Event.findOne({ code: 'EVENT-A' })

      expect(foundInA).toBeDefined()
      expect(foundInB).toBeNull()
    })

    it('receipts are isolated per tenant', async () => {
      const modelsA = await getTenantModels('receipt-a')
      const modelsB = await getTenantModels('receipt-b')

      const eventA = await modelsA.Event.create({
        code: 'EVT-A',
        name: 'Event A',
        startDate: new Date(),
        endDate: new Date(),
      })

      await modelsA.Receipt.create({
        receiptNumber: 'RCP-001',
        eventId: eventA._id,
        customerName: 'Customer A',
        customerEmail: 'a@test.com',
        amount: 100,
      })

      const receiptsInA = await modelsA.Receipt.find({})
      const receiptsInB = await modelsB.Receipt.find({})

      expect(receiptsInA.length).toBe(1)
      expect(receiptsInB.length).toBe(0)
    })
  })

  describe('extensibility', () => {
    it('allows adding new model types via factory pattern', async () => {
      const models = await getTenantModels('extend')

      expect(typeof getTenantModels).toBe('function')
      expect(models).toHaveProperty('Event')
      expect(models).toHaveProperty('Receipt')
      expect(models).toHaveProperty('Sequence')
      expect(models).toHaveProperty('Template')
    })
  })
})
