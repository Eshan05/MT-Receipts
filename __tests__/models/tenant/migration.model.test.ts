import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import Migration, {
  createMigrationModel,
} from '@/models/tenant/migration.model'
import { getMasterConnection } from '@/lib/db/conn'
import { getTenantConnection, clearAllTenantConnections } from '@/lib/db/tenant'

describe('Migration Model', () => {
  beforeEach(async () => {
    await getMasterConnection()
    await Migration.deleteMany({})
    await Migration.ensureIndexes()
  })

  afterEach(async () => {
    await Migration.deleteMany({})
  })

  describe('schema validation', () => {
    it('creates migration with required fields', async () => {
      const migration = await Migration.create({
        name: '001_initial_schema',
        checksum: 'abc123def456',
      })

      expect(migration.name).toBe('001_initial_schema')
      expect(migration.checksum).toBe('abc123def456')
      expect(migration.appliedAt).toBeDefined()
    })

    it('sets appliedAt to current date by default', async () => {
      const before = new Date()
      const migration = await Migration.create({
        name: '002_test',
        checksum: 'checksum',
      })
      const after = new Date()

      expect(migration.appliedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(migration.appliedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('allows custom appliedAt', async () => {
      const customDate = new Date('2025-01-15T10:00:00Z')
      const migration = await Migration.create({
        name: '003_custom_date',
        checksum: 'checksum',
        appliedAt: customDate,
      })

      expect(migration.appliedAt).toEqual(customDate)
    })

    it('allows optional duration field', async () => {
      const migration = await Migration.create({
        name: '004_with_duration',
        checksum: 'checksum',
        duration: 1234,
      })

      expect(migration.duration).toBe(1234)
    })

    it('rejects duplicate migration names', async () => {
      await Migration.create({
        name: '005_unique',
        checksum: 'checksum1',
      })

      await expect(
        Migration.create({
          name: '005_unique',
          checksum: 'checksum2',
        })
      ).rejects.toThrow()
    })

    it('requires checksum field', async () => {
      await expect(
        Migration.create({
          name: '006_no_checksum',
        } as any)
      ).rejects.toThrow()
    })
  })

  describe('findApplied static method', () => {
    it('returns empty array when no migrations', async () => {
      const applied = await Migration.findApplied()
      expect(applied).toEqual([])
    })

    it('returns migrations sorted by appliedAt ascending', async () => {
      await Migration.create({
        name: '003_third',
        checksum: 'c3',
        appliedAt: new Date('2025-01-03'),
      })
      await Migration.create({
        name: '001_first',
        checksum: 'c1',
        appliedAt: new Date('2025-01-01'),
      })
      await Migration.create({
        name: '002_second',
        checksum: 'c2',
        appliedAt: new Date('2025-01-02'),
      })

      const applied = await Migration.findApplied()
      expect(applied).toHaveLength(3)
      expect(applied[0].name).toBe('001_first')
      expect(applied[1].name).toBe('002_second')
      expect(applied[2].name).toBe('003_third')
    })

    it('returns all applied migrations', async () => {
      await Migration.create({ name: 'migration_a', checksum: 'a' })
      await Migration.create({ name: 'migration_b', checksum: 'b' })
      await Migration.create({ name: 'migration_c', checksum: 'c' })

      const applied = await Migration.findApplied()
      expect(applied).toHaveLength(3)
    })
  })

  describe('isApplied static method', () => {
    it('returns true for applied migration', async () => {
      await Migration.create({
        name: 'applied_migration',
        checksum: 'checksum',
      })

      const isApplied = await Migration.isApplied('applied_migration')
      expect(isApplied).toBe(true)
    })

    it('returns false for non-existent migration', async () => {
      const isApplied = await Migration.isApplied('non_existent')
      expect(isApplied).toBe(false)
    })

    it('returns false when no migrations exist', async () => {
      const isApplied = await Migration.isApplied('any_migration')
      expect(isApplied).toBe(false)
    })
  })

  describe('createMigrationModel function', () => {
    beforeEach(() => {
      clearAllTenantConnections()
    })

    afterEach(() => {
      clearAllTenantConnections()
    })

    it('creates model bound to tenant database', async () => {
      const conn = await getTenantConnection('migrationtest')
      const TenantMigration = createMigrationModel(conn)

      await TenantMigration.create({
        name: 'tenant_migration',
        checksum: 'tenant_checksum',
      })

      const found = await TenantMigration.findOne({
        name: 'tenant_migration',
      })
      expect(found).toBeDefined()
      expect(found?.checksum).toBe('tenant_checksum')
    })

    it('is isolated from master database', async () => {
      await Migration.create({
        name: 'master_migration',
        checksum: 'master_checksum',
      })

      const conn = await getTenantConnection('isolationtest')
      const TenantMigration = createMigrationModel(conn)

      const found = await TenantMigration.findOne({ name: 'master_migration' })
      expect(found).toBeNull()
    })

    it('uses separate collection per tenant database', async () => {
      const conn1 = await getTenantConnection('tenant1')
      const conn2 = await getTenantConnection('tenant2')

      const Migration1 = createMigrationModel(conn1)
      const Migration2 = createMigrationModel(conn2)

      await Migration1.create({
        name: 'tenant1_only',
        checksum: 'checksum1',
      })
      await Migration2.create({
        name: 'tenant2_only',
        checksum: 'checksum2',
      })

      const found1 = await Migration1.findOne({ name: 'tenant1_only' })
      const found2 = await Migration2.findOne({ name: 'tenant1_only' })

      expect(found1).toBeDefined()
      expect(found2).toBeNull()
    })

    it('supports same static methods as master model', async () => {
      const conn = await getTenantConnection('methodtest')
      const TenantMigration = createMigrationModel(conn)

      await TenantMigration.create({
        name: 'test_migration',
        checksum: 'checksum',
      })

      const isApplied = await TenantMigration.isApplied('test_migration')
      expect(isApplied).toBe(true)

      const applied = await TenantMigration.findApplied()
      expect(applied).toHaveLength(1)
    })
  })

  describe('checksum tracking', () => {
    it('stores checksum for integrity verification', async () => {
      const migration = await Migration.create({
        name: 'checksum_test',
        checksum: 'sha256:abc123',
      })

      expect(migration.checksum).toBe('sha256:abc123')
    })

    it('allows different checksums for different migrations', async () => {
      const m1 = await Migration.create({
        name: 'migration_one',
        checksum: 'checksum_1',
      })
      const m2 = await Migration.create({
        name: 'migration_two',
        checksum: 'checksum_2',
      })

      expect(m1.checksum).not.toBe(m2.checksum)
    })
  })

  describe('duration tracking', () => {
    it('records migration duration', async () => {
      const migration = await Migration.create({
        name: 'timed_migration',
        checksum: 'checksum',
        duration: 500,
      })

      expect(migration.duration).toBe(500)
    })

    it('duration is optional', async () => {
      const migration = await Migration.create({
        name: 'untimed_migration',
        checksum: 'checksum',
      })

      expect(migration.duration).toBeUndefined()
    })
  })
})
