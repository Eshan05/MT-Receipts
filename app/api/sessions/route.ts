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
} from '@/lib/auth/auth'
import { setCachedOrganization } from '@/lib/redis'
import { z } from 'zod'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

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
  const meta = getRequestMeta(request)
  const log = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    await dbConnect()
    const body = await request.json()

    const switchValidation = switchOrgSchema.safeParse(body)
    if (switchValidation.success) {
      return handleOrgSwitch(switchValidation.data.organizationSlug, request)
    }

    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      )
    }
    const { email, password } = validationResult.data

    // Rate limit login attempts by IP and IP+email.
    const ipScope = `ip:${meta.ip || 'unknown'}`
    const emailScope = `ip:${meta.ip || 'unknown'}:email:${email.toLowerCase()}`

    const rlIp = await checkRateLimit({
      policy: RATE_LIMITS.loginAttemptsPerIp,
      scope: ipScope,
    })
    if (!rlIp.success) {
      log.warn('rate_limited', { limiter: rlIp.policy.name, scope: ipScope })
      return rateLimitedResponse(rlIp)
    }

    const rlIpEmail = await checkRateLimit({
      policy: RATE_LIMITS.loginAttemptsPerIpEmail,
      scope: emailScope,
    })
    if (!rlIpEmail.success) {
      log.warn('rate_limited', {
        limiter: rlIpEmail.policy.name,
        scope: emailScope,
      })
      return rateLimitedResponse(rlIpEmail)
    }

    const user = await User.findOne({ email })
    if (!user) {
      log.warn('login_failed_no_such_user', {
        email: email.toLowerCase(),
      })
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const passwordMatch = await User.comparePassword(password, user.passhash)
    if (!passwordMatch) {
      await writeAuditLog({
        userId: user._id.toString(),
        action: 'LOGIN',
        resourceType: 'USER',
        resourceId: user._id.toString(),
        details: {
          outcome: 'bad_password',
          requestId: meta.requestId,
        },
        status: 'FAILURE',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      }).catch(() => undefined)
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

    log.info('session_created', {
      userId: user._id.toString(),
      isSuperAdmin: !!user.isSuperAdmin,
      currentOrgSlug: currentOrganization?.slug || null,
    })

    await writeAuditLog({
      userId: user._id.toString(),
      organizationId: currentOrganization?.id,
      organizationSlug: currentOrganization?.slug,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      details: {
        requestId: meta.requestId,
        currentOrgSlug: currentOrganization?.slug || null,
      },
      status: 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => undefined)

    return response
  } catch (error) {
    log.error('login_error', { error })
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function handleOrgSwitch(organizationSlug: string, request?: Request) {
  const meta = getRequestMeta(request)
  const log = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  const token = await getTokenServer(request)
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
    log.warn('switch_org_denied', {
      userId: user._id.toString(),
      targetOrgSlug: organizationSlug,
    })
    return NextResponse.json(
      { error: 'You are not a member of this organization' },
      { status: 403 }
    )
  }

  const org = await Organization.findBySlug(organizationSlug)
  if (!org || org.status !== 'active') {
    log.warn('switch_org_unavailable', {
      userId: user._id.toString(),
      targetOrgSlug: organizationSlug,
    })
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

  log.info('switch_org_success', {
    userId: user._id.toString(),
    organizationId: org._id.toString(),
    organizationSlug: org.slug,
  })

  await writeAuditLog({
    userId: user._id.toString(),
    organizationId: org._id.toString(),
    organizationSlug: org.slug,
    action: 'SWITCH_ORG',
    resourceType: 'ORGANIZATION',
    resourceId: org._id.toString(),
    details: { requestId: meta.requestId },
    status: 'SUCCESS',
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  }).catch(() => undefined)

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
