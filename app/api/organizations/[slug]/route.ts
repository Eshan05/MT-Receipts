import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { verifyAuthToken, getTokenServer } from '@/lib/auth'
import {
  setCachedOrganization,
  invalidateCachedOrganization,
} from '@/lib/redis'
import { z } from 'zod'

const updateOrganizationSchema = z.object({
  name: z.string().min(3).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  logoUrl: z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined
    }
    return value
  }, z.string().url().trim().optional()),
  settings: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      organizationName: z.string().optional(),
      receiptNumberFormat: z.string().optional(),
      defaultTemplate: z.string().optional(),
      emailFromName: z.string().optional(),
      emailFromAddress: z.string().email().optional(),
    })
    .optional(),
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

    await dbConnect()
    const organization = await Organization.findBySlug(slug)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    await setCachedOrganization(organization.slug, {
      id: organization._id.toString(),
      slug: organization.slug,
      name: organization.name,
      status: organization.status,
    })

    return NextResponse.json({
      id: organization._id,
      slug: organization.slug,
      name: organization.name,
      description: organization.description,
      logoUrl: organization.logoUrl,
      status: organization.status,
      settings: organization.settings,
    })
  } catch (error) {
    console.error('Organization fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params
    const token = await getTokenServer()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken || !verifiedToken.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const user = await User.findOne({ email: verifiedToken.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const organization = await Organization.findBySlug(slug)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const membership = user.memberships.find(
      (m) => m.organizationId.toString() === String(organization._id)
    )

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update this organization' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateOrganizationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    if (updateData.name !== undefined) {
      organization.name = updateData.name
    }
    if (updateData.description !== undefined) {
      organization.description = updateData.description
    }
    if (updateData.logoUrl !== undefined) {
      organization.logoUrl = updateData.logoUrl
    }
    if (updateData.settings !== undefined) {
      organization.settings = {
        ...organization.settings,
        ...updateData.settings,
      }
    }

    await organization.save()

    await invalidateCachedOrganization(organization.slug)
    await setCachedOrganization(organization.slug, {
      id: organization._id.toString(),
      slug: organization.slug,
      name: organization.name,
      status: organization.status,
    })

    return NextResponse.json({
      message: 'Organization updated successfully',
      organization: {
        id: organization._id,
        slug: organization.slug,
        name: organization.name,
        description: organization.description,
        logoUrl: organization.logoUrl,
        settings: organization.settings,
      },
    })
  } catch (error) {
    console.error('Organization update error:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}
