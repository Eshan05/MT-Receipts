/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

vi.mock('@/models/organization.model', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import { getOrganizationBrandingBySlug } from '@/lib/tenants/organization-branding'

describe('getOrganizationBrandingBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when organization is missing', async () => {
    vi.mocked(Organization.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as never)

    const result = await getOrganizationBrandingBySlug('missing-org')

    expect(result).toBeNull()
    expect(dbConnect).toHaveBeenCalledOnce()
  })

  it('maps branding fields from organization settings', async () => {
    vi.mocked(Organization.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: 'ACES',
          description: 'Association of Computer Engineers Society',
          logoUrl: 'https://example.com/logo.png',
          settings: {
            organizationName: 'ACES Official',
            address: 'RMDSSOE, Pune, MH, India',
            primaryColor: '#112233',
            secondaryColor: '#445566',
            receiptNumberFormat: '{orgCode}-{seq}',
            defaultTemplate: 'professional-dark',
            emailFromName: 'ACES Team',
            emailFromAddress: 'team@aces.dev',
          },
        }),
      }),
    } as never)

    const result = await getOrganizationBrandingBySlug('ACES')

    expect(result).toEqual({
      organizationName: 'Association of Computer Engineers Society',
      organizationAddress: 'RMDSSOE, Pune, MH, India',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#112233',
      secondaryColor: '#445566',
      receiptNumberFormat: '{orgCode}-{seq}',
      defaultTemplate: 'professional-dark',
      emailFromName: 'ACES Team',
      emailFromAddress: 'team@aces.dev',
    })
    expect(Organization.findOne).toHaveBeenCalledWith({ slug: 'aces' })
  })

  it('falls back to organization name when organizationName setting is absent', async () => {
    vi.mocked(Organization.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: 'Robotics Club',
          description: undefined,
          logoUrl: undefined,
          settings: {},
        }),
      }),
    } as never)

    const result = await getOrganizationBrandingBySlug('robotics')

    expect(result?.organizationName).toBe('Robotics Club')
  })
})
