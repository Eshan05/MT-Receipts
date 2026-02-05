import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import type { IUser } from '@/models/user.model'
import {
  setAuthCookie,
  clearAuthCookie,
  clearCurrentOrgCookie,
  verifyAuthToken,
  getTokenServer,
  getCurrentOrgSlug,
  setCurrentOrgCookie,
} from '@/lib/auth'
import { setCachedOrganization } from '@/lib/redis'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const switchOrgSchema = z.object({
  action: z.literal('switch'),
  organizationSlug: z.string().min(1),
})

type SessionMembership = {
  organizationId: string
  organizationSlug: string
  organizationName: string
  role: 'admin' | 'member'
}

async function markMembershipLastSignedIn(
  userId: string,
  organizationSlug?: string
): Promise<void> {
  if (!organizationSlug) return

  await User.updateOne(
    {
      _id: userId,
      'memberships.organizationSlug': organizationSlug,
    },
    {
      $set: {
        'memberships.$.lastSignedInAt': new Date(),
      },
    }
  )
}

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()

    const switchValidation = switchOrgSchema.safeParse(body)
    if (switchValidation.success) {
      return handleOrgSwitch(switchValidation.data.organizationSlug)
    }

    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }
    const { email, password } = validationResult.data

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const passwordMatch = await User.comparePassword(password, user.passhash)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    user.lastSignIn = new Date()
    await user.save()

    const memberships = await buildMemberships(user)

    let currentOrganization = null

    if (user.currentOrganizationSlug && memberships.length > 0) {
      const currentMembership = memberships.find(
        (m) => m.organizationSlug === user.currentOrganizationSlug
      )
      if (currentMembership) {
        currentOrganization = {
          id: currentMembership.organizationId,
          slug: currentMembership.organizationSlug,
          name: currentMembership.organizationName,
          role: currentMembership.role,
        }
      }
    }

    if (!currentOrganization && memberships.length > 0) {
      currentOrganization = {
        id: memberships[0].organizationId,
        slug: memberships[0].organizationSlug,
        name: memberships[0].organizationName,
        role: memberships[0].role,
      }

      user.currentOrganizationSlug = memberships[0].organizationSlug
      await user.save()
    }

    const response = NextResponse.json(
      {
        message: 'Session created',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          isSuperAdmin: user.isSuperAdmin,
        },
        memberships,
        currentOrganization,
      },
      { status: 201 }
    )
    await setAuthCookie(email, response, {
      isSuperAdmin: !!user.isSuperAdmin,
    })

    if (currentOrganization) {
      await setCurrentOrgCookie(currentOrganization.slug, response)
      await markMembershipLastSignedIn(
        user._id.toString(),
        currentOrganization.slug
      )
    }

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function handleOrgSwitch(organizationSlug: string) {
  const token = await getTokenServer()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const verifiedToken = await verifyAuthToken(token)
  if (!verifiedToken || !verifiedToken.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await User.findOne({ email: verifiedToken.email })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const membership = user.memberships.find(
    (m) => m.organizationSlug === organizationSlug
  )

  if (!membership) {
    return NextResponse.json(
      { error: 'You are not a member of this organization' },
      { status: 403 }
    )
  }

  const org = await Organization.findBySlug(organizationSlug)
  if (!org || org.status !== 'active') {
    return NextResponse.json(
      { error: 'Organization not available' },
      { status: 404 }
    )
  }

  user.currentOrganizationSlug = organizationSlug
  await user.save()
  await markMembershipLastSignedIn(user._id.toString(), organizationSlug)

  const response = NextResponse.json({
    message: 'Organization switched',
    currentOrganization: {
      id: org._id,
      slug: org.slug,
      name: org.name,
      role: membership.role,
    },
  })

  await setCurrentOrgCookie(organizationSlug, response)
  return response
}

async function buildMemberships(
  user: Pick<IUser, 'memberships'>
): Promise<SessionMembership[]> {
  if (!user.memberships || user.memberships.length === 0) {
    return []
  }

  const orgIds = user.memberships.map((m) => m.organizationId)
  const orgs = await Organization.find({ _id: { $in: orgIds } })

  for (const org of orgs) {
    await setCachedOrganization(org.slug, {
      id: org._id.toString(),
      slug: org.slug,
      name: org.name,
      status: org.status,
    })
  }

  return user.memberships.map((m) => {
    const org = orgs.find(
      (o) => o._id.toString() === m.organizationId.toString()
    )
    return {
      organizationId: m.organizationId.toString(),
      organizationSlug: m.organizationSlug,
      organizationName: org?.name || 'Unknown',
      role: m.role,
    }
  })
}

export async function GET() {
  try {
    const token = await getTokenServer()

    if (!token || token.trim() === '') {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    await dbConnect()
    const user = await User.findOne({ email: verifiedToken.email })

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const memberships = await buildMemberships(user)

    let currentOrganization = null
    if (user.currentOrganizationSlug && memberships.length > 0) {
      const currentMembership = memberships.find(
        (m) => m.organizationSlug === user.currentOrganizationSlug
      )
      if (currentMembership) {
        currentOrganization = {
          id: currentMembership.organizationId,
          slug: currentMembership.organizationSlug,
          name: currentMembership.organizationName,
          role: currentMembership.role,
        }
      }
    }

    if (!currentOrganization && memberships.length > 0) {
      currentOrganization = {
        id: memberships[0].organizationId,
        slug: memberships[0].organizationSlug,
        name: memberships[0].organizationName,
        role: memberships[0].role,
      }

      user.currentOrganizationSlug = memberships[0].organizationSlug
      await user.save()
    }

    if (currentOrganization) {
      await markMembershipLastSignedIn(
        user._id.toString(),
        currentOrganization.slug
      )
      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          isSuperAdmin: user.isSuperAdmin,
        },
        memberships,
        currentOrganization,
      })
      await setAuthCookie(user.email, response, {
        isSuperAdmin: !!user.isSuperAdmin,
      })
      await setCurrentOrgCookie(currentOrganization.slug, response)
      return response
    }

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        isSuperAdmin: user.isSuperAdmin,
      },
      memberships,
      currentOrganization,
    })
    await setAuthCookie(user.email, response, {
      isSuperAdmin: !!user.isSuperAdmin,
    })
    return response
  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { message: 'Session destroyed' },
    { status: 200 }
  )
  await clearAuthCookie(response)
  await clearCurrentOrgCookie(response)
  return response
}
