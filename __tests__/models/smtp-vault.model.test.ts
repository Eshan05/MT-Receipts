import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { getMasterConnection, resetMasterConnection } from '@/lib/db/conn'
import SMTPVault from '@/models/smtp-vault.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'

describe('SMTP Vault Model', () => {
  let testUser: mongoose.Types.ObjectId
  let testOrg: mongoose.Types.ObjectId

  beforeEach(async () => {
    await getMasterConnection()
    await SMTPVault.deleteMany({})
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
    await SMTPVault.deleteMany({})
    await Organization.deleteMany({})
    await User.deleteMany({})
  })

  describe('schema validation', () => {
    it('creates vault entry with all required fields', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Primary Gmail',
        email: 'test@gmail.com',
        encryptedAppPassword: 'encrypted123',
        iv: 'iv123',
        authTag: 'tag123',
        createdBy: testUser,
      })

      expect(vault.organizationId.toString()).toBe(testOrg.toString())
      expect(vault.label).toBe('Primary Gmail')
      expect(vault.email).toBe('test@gmail.com')
      expect(vault.encryptedAppPassword).toBe('encrypted123')
      expect(vault.iv).toBe('iv123')
      expect(vault.authTag).toBe('tag123')
      expect(vault.isDefault).toBe(false)
    })

    it('lowercases email automatically', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Test',
        email: 'TEST@GMAIL.COM',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      expect(vault.email).toBe('test@gmail.com')
    })
  })

  describe('organization scoping', () => {
    it('allows same email in different organizations', async () => {
      const org2 = await Organization.create({
        slug: 'testorg2',
        name: 'Test Org 2',
        createdBy: testUser,
        status: 'active',
      })

      await SMTPVault.create({
        organizationId: testOrg,
        label: 'Org1 Vault',
        email: 'shared@gmail.com',
        encryptedAppPassword: 'enc1',
        iv: 'iv1',
        authTag: 'tag1',
        createdBy: testUser,
      })

      const vault2 = await SMTPVault.create({
        organizationId: org2._id,
        label: 'Org2 Vault',
        email: 'shared@gmail.com',
        encryptedAppPassword: 'enc2',
        iv: 'iv2',
        authTag: 'tag2',
        createdBy: testUser,
      })

      expect(vault2.email).toBe('shared@gmail.com')
    })

    it('prevents duplicate email within same organization', async () => {
      await SMTPVault.create({
        organizationId: testOrg,
        label: 'First Vault',
        email: 'unique@gmail.com',
        encryptedAppPassword: 'enc1',
        iv: 'iv1',
        authTag: 'tag1',
        createdBy: testUser,
      })

      await expect(
        SMTPVault.create({
          organizationId: testOrg,
          label: 'Second Vault',
          email: 'unique@gmail.com',
          encryptedAppPassword: 'enc2',
          iv: 'iv2',
          authTag: 'tag2',
          createdBy: testUser,
        })
      ).rejects.toThrow()
    })
  })

  describe('isDefault behavior', () => {
    it('defaults to false', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Test',
        email: 'default@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      expect(vault.isDefault).toBe(false)
    })

    it('can be set to true', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Default Vault',
        email: 'default2@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        isDefault: true,
        createdBy: testUser,
      })

      expect(vault.isDefault).toBe(true)
    })

    it('allows multiple default vaults across organizations', async () => {
      const org2 = await Organization.create({
        slug: 'multidefault',
        name: 'Org 2',
        createdBy: testUser,
        status: 'active',
      })

      await SMTPVault.create({
        organizationId: testOrg,
        label: 'Default 1',
        email: 'default1@org1.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        isDefault: true,
        createdBy: testUser,
      })

      const vault2 = await SMTPVault.create({
        organizationId: org2._id,
        label: 'Default 2',
        email: 'default2@org2.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        isDefault: true,
        createdBy: testUser,
      })

      expect(vault2.isDefault).toBe(true)
    })
  })

  describe('label validation', () => {
    it('accepts labels within maxlength', async () => {
      const label = 'A'.repeat(80)
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label,
        email: 'label@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      expect(vault.label).toBe(label)
    })

    it('rejects labels longer than 80 characters', async () => {
      await expect(
        SMTPVault.create({
          organizationId: testOrg,
          label: 'A'.repeat(81),
          email: 'longlabel@test.com',
          encryptedAppPassword: 'enc',
          iv: 'iv',
          authTag: 'tag',
          createdBy: testUser,
        })
      ).rejects.toThrow()
    })

    it('trims label whitespace', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: '  Trimmed Label  ',
        email: 'trim@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      expect(vault.label).toBe('Trimmed Label')
    })

    it('allows optional label', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        email: 'nolabel@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      expect(vault.label).toBeUndefined()
    })
  })

  describe('lastUsedAt tracking', () => {
    it('starts without lastUsedAt', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'New Vault',
        email: 'new@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      expect(vault.lastUsedAt).toBeUndefined()
    })

    it('can update lastUsedAt on use', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Track Use',
        email: 'track@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      const usedAt = new Date()
      vault.lastUsedAt = usedAt
      await vault.save()

      const found = await SMTPVault.findById(vault._id)
      expect(found?.lastUsedAt).toEqual(usedAt)
    })

    it('tracks multiple uses over time', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Multi Use',
        email: 'multi@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      const firstUse = new Date('2025-01-01')
      vault.lastUsedAt = firstUse
      await vault.save()

      const secondUse = new Date('2025-01-15')
      vault.lastUsedAt = secondUse
      await vault.save()

      const found = await SMTPVault.findById(vault._id)
      expect(found?.lastUsedAt).toEqual(secondUse)
    })
  })

  describe('vault management workflow', () => {
    it('can list all vaults for an organization', async () => {
      await SMTPVault.create({
        organizationId: testOrg,
        label: 'Vault 1',
        email: 'vault1@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })
      await SMTPVault.create({
        organizationId: testOrg,
        label: 'Vault 2',
        email: 'vault2@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      const vaults = await SMTPVault.find({ organizationId: testOrg })
      expect(vaults).toHaveLength(2)
    })

    it('can delete a vault', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'To Delete',
        email: 'delete@test.com',
        encryptedAppPassword: 'enc',
        iv: 'iv',
        authTag: 'tag',
        createdBy: testUser,
      })

      await SMTPVault.findByIdAndDelete(vault._id)

      const found = await SMTPVault.findById(vault._id)
      expect(found).toBeNull()
    })

    it('can update vault credentials', async () => {
      const vault = await SMTPVault.create({
        organizationId: testOrg,
        label: 'Update Test',
        email: 'update@test.com',
        encryptedAppPassword: 'old-enc',
        iv: 'old-iv',
        authTag: 'old-tag',
        createdBy: testUser,
      })

      vault.encryptedAppPassword = 'new-enc'
      vault.iv = 'new-iv'
      vault.authTag = 'new-tag'
      await vault.save()

      const found = await SMTPVault.findById(vault._id)
      expect(found?.encryptedAppPassword).toBe('new-enc')
      expect(found?.iv).toBe('new-iv')
      expect(found?.authTag).toBe('new-tag')
    })
  })

  describe('encryption fields', () => {
    it('requires iv field', async () => {
      await expect(
        SMTPVault.create({
          organizationId: testOrg,
          label: 'Test',
          email: 'noiv@test.com',
          encryptedAppPassword: 'enc',
          authTag: 'tag',
          createdBy: testUser,
        } as unknown as Parameters<typeof SMTPVault.create>[0])
      ).rejects.toThrow()
    })

    it('requires authTag field', async () => {
      await expect(
        SMTPVault.create({
          organizationId: testOrg,
          label: 'Test',
          email: 'noauthtag@test.com',
          encryptedAppPassword: 'enc',
          iv: 'iv',
          createdBy: testUser,
        } as unknown as Parameters<typeof SMTPVault.create>[0])
      ).rejects.toThrow()
    })
  })

  describe('indexes', () => {
    it('has compound index on organizationId and email', () => {
      const indexes = SMTPVault.schema.indexes()
      const hasOrgEmailIndex = indexes.some(
        (idx) =>
          idx[0].organizationId !== undefined && idx[0].email !== undefined
      )
      expect(hasOrgEmailIndex).toBe(true)
    })

    it('has compound index on organizationId and isDefault', () => {
      const indexes = SMTPVault.schema.indexes()
      const hasOrgDefaultIndex = indexes.some(
        (idx) =>
          idx[0].organizationId !== undefined && idx[0].isDefault !== undefined
      )
      expect(hasOrgDefaultIndex).toBe(true)
    })
  })
})
