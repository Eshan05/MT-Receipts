import dbConnect from '@/lib/db-conn'
import Template from '@/models/template.model'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
    const { id } = await params
    const body = await req.json()

    const { name, description, config, isDefault } = body

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
    if (isDefault !== undefined) template.isDefault = isDefault

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
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
