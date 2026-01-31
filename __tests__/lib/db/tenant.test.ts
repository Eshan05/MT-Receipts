import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import {
  getTenantConnection,
  validateSlug,
  getTenantDbName,
  closeTenantConnection,
  getActiveTenantConnections,
  clearAllTenantConnections,
} from '@/lib/db/tenant'
import { getMasterConnection } from '@/lib/db/conn'

describe('Tenant Connection Manager', () => {
  beforeEach(async () => {
    clearAllTenantConnections()
    await getMasterConnection()
  })

  afterEach(async () => {
    clearAllTenantConnections()
  })

  describe('validateSlug', () => {
    it('accepts valid slugs', () => {
      expect(validateSlug('aces')).toEqual({ valid: true })
      expect(validateSlug('robotics')).toEqual({ valid: true })
      expect(validateSlug('tech-club')).toEqual({ valid: true })
      expect(validateSlug('abc')).toEqual({ valid: true })
    })

    it('rejects slugs shorter than 3 characters', () => {
      const result = validateSlug('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 3 characters')
    })

    it('rejects slugs longer than 20 characters', () => {
      const result = validateSlug('this-is-a-very-long-slug')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at most 20 characters')
    })

    it('rejects slugs starting with number', () => {
      const result = validateSlug('123abc')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('start with a letter')
    })

    it('rejects slugs with uppercase letters', () => {
      const result = validateSlug('ACES')
      expect(result.valid).toBe(false)
    })

    it('rejects slugs with special characters', () => {
      const result = validateSlug('aces!')
      expect(result.valid).toBe(false)
    })

    it('rejects slugs with trailing hyphen', () => {
      const result = validateSlug('aces-')
      expect(result.valid).toBe(false)
    })
  })

  describe('getTenantDbName', () => {
    it('generates correct database name with default prefix', () => {
      expect(getTenantDbName('aces')).toBe('org_aces')
      expect(getTenantDbName('robotics')).toBe('org_robotics')
    })

    it('respects custom prefix from environment', () => {
      const result = validateSlug('aces')
      expect(result.valid).toBe(true)
      expect(getTenantDbName('aces')).toBe('org_aces')
    })
  })

  describe('getTenantConnection', () => {
    it('returns a connection for valid slug', async () => {
      const conn = await getTenantConnection('testorg')
      expect(conn).toBeDefined()
      expect(conn.name).toBe('org_testorg')
    })

    it('returns same connection for same slug (caching)', async () => {
      const conn1 = await getTenantConnection('cached')
      const conn2 = await getTenantConnection('cached')
      expect(conn1).toBe(conn2)
    })

    it('returns different connections for different slugs', async () => {
      const conn1 = await getTenantConnection('org1')
      const conn2 = await getTenantConnection('org2')
      expect(conn1.name).toBe('org_org1')
      expect(conn2.name).toBe('org_org2')
      expect(conn1).not.toBe(conn2)
    })

    it('throws error for invalid slug', async () => {
      await expect(getTenantConnection('ab')).rejects.toThrow('Invalid slug')
    })
  })

  describe('closeTenantConnection', () => {
    it('removes connection from cache', async () => {
      await getTenantConnection('toclose')
      expect(getActiveTenantConnections()).toContain('org_toclose')

      await closeTenantConnection('toclose')
      expect(getActiveTenantConnections()).not.toContain('org_toclose')
    })
  })

  describe('connection isolation', () => {
    it('creates separate databases for each tenant', async () => {
      const conn1 = await getTenantConnection('tenant1')
      const conn2 = await getTenantConnection('tenant2')

      expect(conn1.name).not.toBe(conn2.name)
      expect(conn1.name).toBe('org_tenant1')
      expect(conn2.name).toBe('org_tenant2')
    })
  })
})
