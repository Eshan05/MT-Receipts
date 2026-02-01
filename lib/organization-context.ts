import { headers } from 'next/headers'
import { getCachedOrganization, setCachedOrganization } from '@/lib/redis'
import Organization from '@/models/organization.model'
import { getMasterConnection } from '@/lib/db/conn'

export interface OrganizationContext {
  id: string
  slug: string
  name: string
  status: string
}

export const ORG_ID_HEADER = 'x-organization-id'
export const ORG_SLUG_HEADER = 'x-organization-slug'
export const ORG_NAME_HEADER = 'x-organization-name'

export async function getOrganizationContext(): Promise<OrganizationContext | null> {
  const headersList = await headers()

  const id = headersList.get(ORG_ID_HEADER)
  const slug = headersList.get(ORG_SLUG_HEADER)
  const name = headersList.get(ORG_NAME_HEADER)

  if (!id || !slug || !name) {
    return null
  }

  return {
    id,
    slug,
    name,
    status: 'active',
  }
}

export async function resolveOrganization(
  slug: string
): Promise<OrganizationContext | null> {
  const cached = await getCachedOrganization(slug)

  if (cached) {
    return cached
  }

  await getMasterConnection()
  const org = await Organization.findBySlug(slug)

  if (!org) {
    return null
  }

  const context: OrganizationContext = {
    id: (org._id as { toString(): string }).toString(),
    slug: org.slug,
    name: org.name,
    status: org.status,
  }

  if (org.status === 'active') {
    await setCachedOrganization(slug, context)
  }

  return context
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
    return '/org-not-found'
  }

  switch (org.status) {
    case 'pending':
      return '/org-pending'
    case 'suspended':
      return '/org-suspended'
    case 'deleted':
      return '/org-deleted'
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
