import { renderToStream } from '@react-pdf/renderer'
import Template, { ITemplate } from '@/models/template.model'
import Event from '@/models/event.model'
import dbConnect from '@/lib/db-conn'
import { getTemplateComponent, DEFAULT_TEMPLATE } from '@/lib/templates'
import type {
  TemplateProps,
  TemplateConfig,
  TemplateItem,
} from '@/lib/templates/types'

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

import mongoose from 'mongoose'

async function getTemplateConfig(
  templateId?: string | null,
  slug?: string
): Promise<{ template: ITemplate | null; slug: string }> {
  await dbConnect()

  let template: ITemplate | null = null

  if (templateId) {
    if (
      mongoose.Types.ObjectId.isValid(templateId) &&
      templateId.length === 24
    ) {
      template = await Template.findById(templateId).lean()
    } else {
      template = await Template.findBySlug(templateId)
    }
  } else if (slug) {
    template = await Template.findBySlug(slug)
  }

  if (!template) {
    template = await Template.getDefault()
  }

  if (template) {
    return {
      template,
      slug: template.slug,
    }
  }

  return {
    template: null,
    slug: DEFAULT_TEMPLATE,
  }
}

function buildConfig(template: ITemplate | null): TemplateConfig {
  const defaultLogoUrl =
    'https://res.cloudinary.com/dygc8r0pv/image/upload/v1734452294/ACES_Logo_ACE_White_d6rz6a.png'

  if (!template) {
    return {
      primaryColor: '#1E40AF',
      showQrCode: true,
      organizationName: 'Organization',
      logoUrl: defaultLogoUrl,
    }
  }

  return {
    primaryColor: template.config.primaryColor,
    secondaryColor: template.config.secondaryColor,
    logoUrl: template.config.logoUrl || defaultLogoUrl,
    showQrCode: template.config.showQrCode,
    footerText: template.config.footerText,
    organizationName: template.config.organizationName,
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

  const { template, slug } = await getTemplateConfig(event.templateId)
  const dbConfig = buildConfig(template)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(TemplateComponent(props) as any)

  return {
    stream,
    templateSlug: slug,
    config,
  }
}

export async function getTemplateSlugForEvent(
  eventId: string
): Promise<string> {
  await dbConnect()

  const event = await Event.findById(eventId)
    .select('templateId')
    .populate('templateId', 'slug')
    .lean()

  if (
    event?.templateId &&
    typeof event.templateId === 'object' &&
    'slug' in event.templateId
  ) {
    return (event.templateId as { slug: string }).slug
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
