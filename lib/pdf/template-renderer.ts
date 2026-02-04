import { renderToStream } from '@react-pdf/renderer'
import {
  getTemplateComponent,
  DEFAULT_TEMPLATE,
  templateRegistry,
} from '@/lib/templates'
import type {
  TemplateProps,
  TemplateConfig,
  TemplateItem,
} from '@/lib/templates/types'
import { getOrganizationContext } from '@/lib/organization-context'
import { getTenantModels } from '@/lib/db/tenant-models'

export interface RenderReceiptOptions {
  receiptNumber: string
  customer: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  event: {
    _id: string
    name: string
    code: string
    type: string
    templateId?: string
    location?: string
    startDate?: string
    endDate?: string
  }
  items: TemplateItem[]
  totalAmount: number
  paymentMethod?: string
  date?: string
  notes?: string
  qrCodeData?: string
  customConfig?: TemplateConfig
}

export interface RenderResult {
  stream: NodeJS.ReadableStream
  templateSlug: string
  config: TemplateConfig
}

interface TenantTemplate {
  _id: string
  slug: string
  config: TemplateConfig
}

async function getTemplateConfig(
  templateId?: string | null,
  slug?: string
): Promise<{ template: TenantTemplate | null; slug: string }> {
  const requestedSlug = templateId || slug

  if (requestedSlug && requestedSlug in templateRegistry) {
    return {
      template: null,
      slug: requestedSlug,
    }
  }

  const organization = await getOrganizationContext()
  if (!organization) {
    return {
      template: null,
      slug: requestedSlug || 'professional',
    }
  }

  const { Template } = await getTenantModels(organization.slug)

  let template: TenantTemplate | null = null

  if (requestedSlug) {
    const found = await Template.findBySlug(requestedSlug)
    if (found) {
      template = {
        _id: found._id.toString(),
        slug: found.slug,
        config: found.config,
      }
    }
  }

  if (!template) {
    const defaultTemplate = await Template.getDefault()
    if (defaultTemplate) {
      template = {
        _id: defaultTemplate._id.toString(),
        slug: defaultTemplate.slug,
        config: defaultTemplate.config,
      }
    }
  }

  if (template) {
    return {
      template,
      slug: template.slug,
    }
  }

  return {
    template: null,
    slug: 'professional',
  }
}

function buildConfig(
  template: TenantTemplate | null,
  orgName?: string
): TemplateConfig {
  const defaultLogoUrl =
    'https://res.cloudinary.com/dygc8r0pv/image/upload/v1734452294/ACES_Logo_ACE_White_d6rz6a.png'

  if (!template) {
    return {
      primaryColor: '#1E40AF',
      showQrCode: true,
      organizationName: orgName || 'Organization',
      logoUrl: defaultLogoUrl,
    }
  }

  return {
    primaryColor: template.config.primaryColor,
    secondaryColor: template.config.secondaryColor,
    logoUrl: template.config.logoUrl || defaultLogoUrl,
    showQrCode: template.config.showQrCode,
    footerText: template.config.footerText,
    organizationName:
      template.config.organizationName || orgName || 'Organization',
  }
}

export async function renderReceiptPDF(
  options: RenderReceiptOptions
): Promise<RenderResult> {
  const {
    receiptNumber,
    customer,
    event,
    items,
    totalAmount,
    paymentMethod,
    notes,
    qrCodeData,
    customConfig,
  } = options

  const date =
    options.date ||
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

  const organization = await getOrganizationContext()
  const { template, slug } = await getTemplateConfig(event.templateId)
  const dbConfig = buildConfig(template, organization?.name)
  const config = customConfig || dbConfig
  const TemplateComponent = getTemplateComponent(slug)

  const props: TemplateProps = {
    receiptNumber,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
    event: {
      name: event.name,
      code: event.code,
      type: event.type,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
    },
    items,
    totalAmount,
    paymentMethod,
    date,
    config,
    notes,
    qrCodeData,
  }

  const stream = await renderToStream(
    TemplateComponent(props) as Parameters<typeof renderToStream>[0]
  )

  return {
    stream,
    templateSlug: slug,
    config,
  }
}

export async function getTemplateSlugForEvent(
  eventId: string
): Promise<string> {
  const organization = await getOrganizationContext()
  if (!organization) {
    return DEFAULT_TEMPLATE
  }

  const { Event, Template } = await getTenantModels(organization.slug)

  const event = await Event.findById(eventId).select('templateId').lean()

  if (event?.templateId) {
    const template = await Template.findById(event.templateId)
    if (template) {
      return template.slug
    }
  }

  const defaultTemplate = await Template.getDefault()
  return defaultTemplate?.slug || DEFAULT_TEMPLATE
}

export async function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export { DEFAULT_TEMPLATE }
