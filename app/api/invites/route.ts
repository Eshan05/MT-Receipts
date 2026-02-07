import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import Organization from '@/models/organization.model'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { render } from '@react-email/components'
import OrganizationInviteEmail from '@/lib/emails/organization-invite-email'
import { enforceMaxUsersForInvite } from '@/lib/tenants/quota-enforcement'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

const createInviteSchema = z.object({
  type: z.enum(['email', 'code']),
  organizationSlug: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'member']).default('member'),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).max(1000).optional(),
})

export async function POST(request: Request) {
  const meta = getRequestMeta(request)
  const baseLog = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const token = await getTokenServer(request)
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
    const validationResult = createInviteSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { type, organizationSlug, email, role, expiresAt, maxUses } =
      validationResult.data

    if (type === 'email' && !email) {
      return NextResponse.json(
        { error: 'Email is required for email invites' },
        { status: 400 }
      )
    }

    const organization = await Organization.findOne({ slug: organizationSlug })
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const log = baseLog.child({
      tenantId: organization._id.toString(),
      tenantSlug: organization.slug,
      userId: user._id.toString(),
    })

    const tenantApiRl = await checkRateLimit({
      policy: RATE_LIMITS.tenantApiRequests,
      scope: `tenant:${organization._id.toString()}`,
    })
    if (!tenantApiRl.success) {
      log.warn('rate_limited', { limiter: tenantApiRl.policy.name })
      return rateLimitedResponse(tenantApiRl)
    }

    const inviteRl = await checkRateLimit({
      policy: RATE_LIMITS.inviteCreate,
      scope: `tenant:${organization._id.toString()}`,
    })
    if (!inviteRl.success) {
      log.warn('rate_limited', { limiter: inviteRl.policy.name })
      return rateLimitedResponse(inviteRl)
    }

    const membership = user.memberships.find(
      (m) =>
        m.organizationId.toString() === organization._id.toString() &&
        m.role === 'admin'
    )

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have admin access to this organization' },
        { status: 403 }
      )
    }

    if (type === 'email' && email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        const existingMembership = existingUser.memberships.find(
          (m) => m.organizationId.toString() === organization._id.toString()
        )
        if (existingMembership) {
          return NextResponse.json(
            { error: 'User is already a member of this organization' },
            { status: 400 }
          )
        }
      }

      const existingInvite = await MembershipRequest.findOne({
        email: email.toLowerCase(),
        organizationId: organization._id,
        type: 'email',
        status: 'pending',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      })

      if (existingInvite) {
        return NextResponse.json(
          { error: 'A pending invite already exists for this email' },
          { status: 400 }
        )
      }

      const quotaCheck = await enforceMaxUsersForInvite({
        organizationId: organization._id,
        slotsToReserve: 1,
      })
      if (quotaCheck) return quotaCheck

      const invite = await MembershipRequest.create({
        organizationId: organization._id,
        organizationSlug: organization.slug,
        type: 'email',
        email: email.toLowerCase(),
        invitedBy: user._id,
        role,
        status: 'pending',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })

      const appUrl =
        process.env.APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

      const emailHtml = await render(
        OrganizationInviteEmail({
          organizationName: organization.name,
          organizationLogo: organization.logoUrl,
          role,
          inviteId: invite._id.toString(),
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          appUrl,
          invitedBy: user.username,
        })
      )

      await sendEmail({
        to: email,
        subject: `You've been invited to join ${organization.name}`,
        html: emailHtml,
        organizationId: organization._id.toString(),
        organizationSlug: organization.slug,
      })

      log.info('invite_created_email', {
        inviteId: invite._id.toString(),
        invitedEmail: email.toLowerCase(),
        role,
      })

      await writeAuditLog({
        userId: user._id.toString(),
        organizationId: organization._id.toString(),
        organizationSlug: organization.slug,
        action: 'CREATE',
        resourceType: 'ORGANIZATION',
        resourceId: organization._id.toString(),
        details: {
          kind: 'invite_email',
          inviteId: invite._id.toString(),
          invitedEmail: email.toLowerCase(),
          role,
          requestId: meta.requestId,
        },
        status: 'SUCCESS',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      }).catch(() => undefined)

      return NextResponse.json(
        {
          id: invite._id,
          email: invite.email,
          organizationSlug: invite.organizationSlug,
          role: invite.role,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
        { status: 201 }
      )
    }

    const code = nanoid(10).toUpperCase()

    const quotaCheck = await enforceMaxUsersForInvite({
      organizationId: organization._id,
      slotsToReserve: maxUses || 1,
    })
    if (quotaCheck) return quotaCheck

    const invite = await MembershipRequest.create({
      organizationId: organization._id,
      organizationSlug: organization.slug,
      type: 'code',
      code,
      invitedBy: user._id,
      role,
      status: 'pending',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses: maxUses || 1,
      usedCount: 0,
    })

    baseLog.info('invite_created_code', {
      tenantId: organization._id.toString(),
      tenantSlug: organization.slug,
      userId: user._id.toString(),
      inviteId: invite._id.toString(),
      maxUses: invite.maxUses,
      role,
    })

    await writeAuditLog({
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      organizationSlug: organization.slug,
      action: 'CREATE',
      resourceType: 'ORGANIZATION',
      resourceId: organization._id.toString(),
      details: {
        kind: 'invite_code',
        inviteId: invite._id.toString(),
        maxUses: invite.maxUses,
        role,
        requestId: meta.requestId,
      },
      status: 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => undefined)

    return NextResponse.json(
      {
        id: invite._id,
        code: invite.code,
        organizationSlug: invite.organizationSlug,
        role: invite.role,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        createdAt: invite.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    baseLog.error('invite_create_error', { error })
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}
