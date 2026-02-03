import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-route'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Template } = ctx.models
    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('includeAll') === 'true'

    const filter = includeAll ? {} : { isActive: { $ne: false } }

    const templates = await Template.find(filter)
      .sort({ isDefault: -1, name: 1 })
      .lean()

    return NextResponse.json({ templates }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Template } = ctx.models
    const body = await request.json()
    const {
      name,
      slug,
      description,
      config,
      isDefault,
      htmlTemplate,
      category,
    } = body

    if (!name || !slug) {
      return NextResponse.json(
        { message: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const existingTemplate = await Template.findOne({ slug })
    if (existingTemplate) {
      return NextResponse.json(
        { message: 'Template with this slug already exists' },
        { status: 400 }
      )
    }

    if (isDefault) {
      await Template.updateMany({}, { isDefault: false })
    }

    const template = await Template.create({
      name,
      slug,
      description,
      config: config || {
        primaryColor: '#1E40AF',
        showQrCode: true,
        organizationName: ctx.organization.name,
      },
      isDefault: isDefault || false,
      htmlTemplate,
      category,
      createdBy: ctx.user.id,
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
