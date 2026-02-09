import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'

export interface OrganizationBranding {
  organizationName: string
  organizationAddress?: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  websiteUrl?: string
  contactEmail?: string
  receiptNumberFormat?: string
  defaultTemplate?: string
  emailFromName?: string
  emailFromAddress?: string
}

export async function getOrganizationBrandingBySlug(
  slug: string
): Promise<OrganizationBranding | null> {
  await dbConnect()

  const organization = await Organization.findOne({ slug: slug.toLowerCase() })
    .select('name description logoUrl settings')
    .lean()

  if (!organization) {
    return null
  }

  return {
    organizationName:
      organization.description?.trim() ||
      organization.settings?.organizationName ||
      organization.name,
    organizationAddress: organization.settings?.address || undefined,
    logoUrl: organization.logoUrl || undefined,
    primaryColor: organization.settings?.primaryColor || undefined,
    secondaryColor: organization.settings?.secondaryColor || undefined,
    websiteUrl: organization.settings?.websiteUrl || undefined,
    contactEmail: organization.settings?.contactEmail || undefined,
    receiptNumberFormat:
      organization.settings?.receiptNumberFormat || undefined,
    defaultTemplate: organization.settings?.defaultTemplate || undefined,
    emailFromName: organization.settings?.emailFromName || undefined,
    emailFromAddress: organization.settings?.emailFromAddress || undefined,
  }
}
