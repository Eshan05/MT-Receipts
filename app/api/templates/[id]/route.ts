import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-route'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Template } = ctx.models
    const { id } = await params

    const template = await Template.findById(id)
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Template } = ctx.models
    const { id } = await params
    const body = await req.json()

    const { name, description, config, isDefault, htmlTemplate, category } =
      body

    const template = await Template.findById(id)
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    if (name && name !== template.name) {
      const existingTemplate = await Template.findOne({
        name,
        _id: { $ne: id },
      })
      if (existingTemplate) {
        return NextResponse.json(
          { message: 'Template with this name already exists' },
          { status: 400 }
        )
      }
      template.name = name
    }

    if (description !== undefined) template.description = description
    if (config) template.config = config
    if (htmlTemplate !== undefined) template.htmlTemplate = htmlTemplate
    if (category !== undefined) template.category = category

    if (isDefault === true && !template.isDefault) {
      await Template.updateMany({}, { isDefault: false })
      template.isDefault = true
    } else if (isDefault === false) {
      template.isDefault = false
    }

    await template.save()

    return NextResponse.json({ template }, { status: 200 })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) return ctx

    const { Template } = ctx.models
    const { id } = await params

    const template = await Template.findByIdAndDelete(id)
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Template deleted' }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
