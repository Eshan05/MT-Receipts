import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import {
  invalidateCachedOrganization,
  setCachedOrganization,
} from '@/lib/redis'
import { getSuperAdminContext } from '@/lib/superadmin-route'

const updateOrganizationSchema = z.object({
  action: z.enum([
    'approve',
    'suspend',
    'restore',
    'delete',
    'limits',
    'config',
  ]),
  name: z.string().min(3).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  logoUrl: z
    .preprocess((value) => {
      if (typeof value === 'string' && value.trim() === '') {
        return undefined
      }
      return value
    }, z.string().url().trim().optional())
    .optional(),
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
  limits: z
    .object({
      maxEvents: z.number().int().min(-1).optional(),
      maxReceiptsPerMonth: z.number().int().min(-1).optional(),
      maxUsers: z.number().int().min(-1).optional(),
    })
    .optional(),
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const superAdmin = await getSuperAdminContext()
  if (superAdmin instanceof NextResponse) return superAdmin

  const { slug } = await params
  await dbConnect()

  const organization = await Organization.findBySlug(slug)
  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  const [memberCount, createdByUser, approvedByUser] = await Promise.all([
    User.countDocuments({
      'memberships.organizationId': organization._id,
    }),
    User.findById(organization.createdBy).select('username email').lean(),
    organization.approvedBy
      ? User.findById(organization.approvedBy).select('username email').lean()
      : Promise.resolve(null),
  ])

  return NextResponse.json({
    organization: {
      id: organization._id.toString(),
      slug: organization.slug,
      name: organization.name,
      description: organization.description,
      logoUrl: organization.logoUrl,
      status: organization.status,
      settings: organization.settings,
      limits: organization.limits,
      memberCount,
      createdAt: organization.createdAt,
      approvedAt: organization.approvedAt,
      approvedBy: approvedByUser
        ? {
            id: approvedByUser._id.toString(),
            username: approvedByUser.username,
            email: approvedByUser.email,
          }
        : null,
      deletedAt: organization.deletedAt,
      restoresBefore: organization.restoresBefore,
      createdBy: createdByUser
        ? {
            id: createdByUser._id.toString(),
            username: createdByUser.username,
            email: createdByUser.email,
          }
        : null,
    },
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const superAdmin = await getSuperAdminContext()
  if (superAdmin instanceof NextResponse) return superAdmin

  const { slug } = await params
  await dbConnect()

  const organization = await Organization.findBySlug(slug)
  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  const body = await request.json()
  const parsed = updateOrganizationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.format() },
      { status: 400 }
    )
  }

  const { action, limits, name, description, logoUrl, settings } = parsed.data

  switch (action) {
    case 'approve':
      organization.status = 'active'
      organization.approvedAt = new Date()
      organization.approvedBy = superAdmin.user.id as never
      break
    case 'suspend':
      organization.status = 'suspended'
      break
    case 'restore':
      organization.status = 'active'
      organization.deletedAt = undefined
      organization.restoresBefore = undefined
      break
    case 'delete': {
      const deletedAt = new Date()
      const restoresBefore = new Date(deletedAt)
      restoresBefore.setDate(restoresBefore.getDate() + 30)

      organization.status = 'deleted'
      organization.deletedAt = deletedAt
      organization.restoresBefore = restoresBefore
      break
    }
    case 'limits':
      if (!limits) {
        return NextResponse.json(
          { error: 'limits object is required for action=limits' },
          { status: 400 }
        )
      }
      organization.limits = {
        ...organization.limits,
        ...limits,
      }
      break
    case 'config':
      if (name !== undefined) {
        organization.name = name
      }
      if (description !== undefined) {
        organization.description = description
      }
      if (logoUrl !== undefined) {
        organization.logoUrl = logoUrl
      }
      if (settings !== undefined) {
        organization.settings = {
          ...organization.settings,
          ...settings,
        }
      }
      break
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
    message: `Organization ${action} action completed`,
    organization: {
      id: organization._id.toString(),
      slug: organization.slug,
      status: organization.status,
      limits: organization.limits,
      approvedAt: organization.approvedAt,
      deletedAt: organization.deletedAt,
      restoresBefore: organization.restoresBefore,
    },
  })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const superAdmin = await getSuperAdminContext()
  if (superAdmin instanceof NextResponse) return superAdmin

  const { slug } = await params
  await dbConnect()

  const organization = await Organization.findBySlug(slug)
  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  if (organization.status !== 'deleted') {
    return NextResponse.json(
      { error: 'Hard delete only allowed for organizations in deleted state' },
      { status: 400 }
    )
  }

  await User.updateMany(
    { 'memberships.organizationId': organization._id },
    {
      $pull: { memberships: { organizationId: organization._id } },
      $unset: { currentOrganizationSlug: '' },
    }
  )

  await Organization.deleteOne({ _id: organization._id })
  await invalidateCachedOrganization(organization.slug)

  return NextResponse.json({
    message: 'Organization permanently deleted',
    slug: organization.slug,
  })
}
