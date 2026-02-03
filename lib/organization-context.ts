import { headers, cookies } from 'next/headers'
import { getCachedOrganization, setCachedOrganization } from '@/lib/redis'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'

export interface OrganizationContext {
  id: string
  slug: string
  name: string
  status: string
}

export const ORG_ID_HEADER = 'x-organization-id'
export const ORG_SLUG_HEADER = 'x-organization-slug'
export const ORG_NAME_HEADER = 'x-organization-name'
export const CURRENT_ORG_COOKIE = 'currentOrganization'

export async function getOrganizationContext(): Promise<OrganizationContext | null> {
  const headersList = await headers()

  const id = headersList.get(ORG_ID_HEADER)
  const slug = headersList.get(ORG_SLUG_HEADER)
  const name = headersList.get(ORG_NAME_HEADER)

  if (id && slug && name) {
    return { id, slug, name, status: 'active' }
  }

  const cookieStore = await cookies()
  const orgSlug = cookieStore.get(CURRENT_ORG_COOKIE)?.value

  if (!orgSlug) {
    return null
  }

  const cachedOrg = await getCachedOrganization(orgSlug)
  if (cachedOrg) {
    return cachedOrg
  }

  try {
    await dbConnect()
    const org = await Organization.findBySlug(orgSlug)
    if (!org || org.status !== 'active') {
      return null
    }

    const orgContext: OrganizationContext = {
      id: (org._id as any).toString(),
      slug: org.slug,
      name: org.name,
      status: org.status,
    }

    await setCachedOrganization(orgSlug, orgContext)

    return orgContext
  } catch (error) {
    console.error('Failed to resolve organization from database:', error)
    return null
  }
}

export async function resolveOrganizationFromCache(
  slug: string
): Promise<OrganizationContext | null> {
  const cachedOrg = await getCachedOrganization(slug)
  if (cachedOrg) {
    return cachedOrg
  }

  try {
    await dbConnect()
    const org = await Organization.findBySlug(slug)
    if (!org) {
      return null
    }

    const orgContext: OrganizationContext = {
      id: (org._id as any).toString(),
      slug: org.slug,
      name: org.name,
      status: org.status,
    }

    await setCachedOrganization(slug, orgContext)

    return orgContext
  } catch (error) {
    console.error('Failed to resolve organization:', error)
    return null
  }
}

export function isOrganizationActive(org: OrganizationContext | null): boolean {
  return org?.status === 'active'
}

export function isOrganizationPending(
  org: OrganizationContext | null
): boolean {
  return org?.status === 'pending'
}

export function isOrganizationSuspended(
  org: OrganizationContext | null
): boolean {
  return org?.status === 'suspended'
}

export function isOrganizationDeleted(
  org: OrganizationContext | null
): boolean {
  return org?.status === 'deleted'
}

export function getOrganizationErrorPath(
  org: OrganizationContext | null
): string | null {
  if (!org) {
    return '/o/404'
  }

  switch (org.status) {
    case 'pending':
      return '/o/202'
    case 'suspended':
      return '/o/403'
    case 'deleted':
      return '/o/410'
    default:
      return null
  }
}

export function createOrganizationHeaders(org: OrganizationContext): Headers {
  const headers = new Headers()
  headers.set(ORG_ID_HEADER, org.id)
  headers.set(ORG_SLUG_HEADER, org.slug)
  headers.set(ORG_NAME_HEADER, org.name)
  return headers
}

export async function cacheOrganization(
  slug: string,
  org: OrganizationContext
): Promise<void> {
  await setCachedOrganization(slug, org)
}
