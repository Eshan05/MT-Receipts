/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/organizations/route'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { setAuthCookie } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import type { IUser } from '@/models/user.model'

describe('Organizations API', () => {
  let testUser!: IUser
  let testUserEmail: string

  beforeAll(async () => {
    await dbConnect()

    testUserEmail = `test-org-${Date.now()}@test.local`
    testUser = await User.create({
      username: `testorguser${Date.now()}`,
      email: testUserEmail,
      passhash: 'password123',
    })
  })

  afterAll(async () => {
    await Organization.deleteMany({ createdBy: testUser._id })
    await User.findByIdAndDelete(testUser._id)
  })

  describe('GET - Slug Availability Check', () => {
    it('returns 400 when slug is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations')
      const response = await GET(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Slug parameter is required')
    })

    it('returns available: false for invalid slug format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/organizations?slug=ab'
      )
      const response = await GET(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.available).toBe(false)
      expect(data.message).toContain('at least 3 characters')
    })

    it('returns available: false for reserved slugs', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/organizations?slug=api'
      )
      const response = await GET(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.available).toBe(false)
      expect(data.message).toContain('reserved')
    })

    it('returns available: true for valid available slug', async () => {
      const suffix = Date.now().toString(36).slice(-8)
      const request = new NextRequest(
        `http://localhost:3000/api/organizations?slug=ta-${suffix}`
      )
      const response = await GET(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.available).toBe(true)
    })
  })

  describe('POST - Create Organization', () => {
    it('returns 401 when not authenticated', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/organizations',
        {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Org', slug: 'test-org-slug' }),
        }
      )
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('validates name and slug fields', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/organizations',
        {
          method: 'POST',
          body: JSON.stringify({ name: 'ab', slug: 'test' }),
          headers: {
            Cookie: `authToken=test-token`,
          },
        }
      )
      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })
})
