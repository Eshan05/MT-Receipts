import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { verifyAuthToken, getTokenServer } from '@/lib/auth'
import { isSlugReserved } from '@/lib/reserved-slugs'
import { z } from 'zod'

const slugCheckSchema = z.object({
  slug: z
    .string()
    .min(3, { error: 'Slug must be at least 3 characters' })
    .max(20, { error: 'Slug must be at most 20 characters' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z][a-z0-9]*$/, {
      error:
        'Slug must start with a letter and contain only letters, numbers, and hyphens',
    }),
})

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(3, { error: 'Name must be at least 3 characters' })
    .max(100, { error: 'Name must be at most 100 characters' })
    .trim(),
  slug: z
    .string()
    .min(3, { error: 'Slug must be at least 3 characters' })
    .max(20, { error: 'Slug must be at most 20 characters' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z][a-z0-9]*$/, {
      error:
        'Slug must start with a letter and contain only letters, numbers, and hyphens',
    })
    .transform((val) => val.toLowerCase().trim()),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      )
    }

    const validationResult = slugCheckSchema.safeParse({ slug })
    if (!validationResult.success) {
      return NextResponse.json(
        {
          available: false,
          message:
            validationResult.error.issues[0]?.message || 'Invalid slug format',
        },
        { status: 200 }
      )
    }

    const normalizedSlug = slug.toLowerCase().trim()

    if (isSlugReserved(normalizedSlug)) {
      return NextResponse.json(
        {
          available: false,
          message: 'This slug is reserved and cannot be used',
        },
        { status: 200 }
      )
    }

    await dbConnect()
    const existingOrg = await Organization.findBySlug(normalizedSlug)

    if (existingOrg) {
      return NextResponse.json(
        { available: false, message: 'This slug is already taken' },
        { status: 200 }
      )
    }

    return NextResponse.json({ available: true }, { status: 200 })
  } catch (error) {
    console.error('Slug check error:', error)
    return NextResponse.json(
      { error: 'Failed to check slug availability' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const validationResult = createOrganizationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { name, slug } = validationResult.data

    if (isSlugReserved(slug)) {
      return NextResponse.json(
        { error: 'This slug is reserved and cannot be used' },
        { status: 400 }
      )
    }

    const existingOrg = await Organization.findBySlug(slug)
    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 }
      )
    }

    const organization = await Organization.create({
      slug,
      name,
      status: 'pending',
      createdBy: user._id,
    })

    user.memberships.push({
      organizationId: organization._id as import('mongoose').Types.ObjectId,
      organizationSlug: organization.slug,
      role: 'admin',
      approvedAt: new Date(),
    })
    await user.save()

    return NextResponse.json(
      {
        message: 'Organization created successfully',
        organization: {
          id: organization._id,
          slug: organization.slug,
          name: organization.name,
          status: organization.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
