import { NextResponse } from 'next/server'
import type mongoose from 'mongoose'
import type { TenantContext } from '@/lib/tenant-route'
import {
  getOrganizationLimits,
  getRolling30DaysStart,
  getUserSlotUsage,
  isUnlimited,
} from '@/lib/limits'

function quotaExceeded(payload: {
  resource: 'events' | 'receipts' | 'users'
  limit: number
  used: number
  message: string
}) {
  return NextResponse.json(
    {
      error: payload.message,
      resource: payload.resource,
      limit: payload.limit,
      used: payload.used,
    },
    { status: 403 }
  )
}

export async function enforceMaxEvents(ctx: TenantContext) {
  const limits = await getOrganizationLimits(ctx.organization.id)
  if (!limits) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  if (isUnlimited(limits.maxEvents)) return null

  const used = await ctx.models.Event.countDocuments({ isActive: true })
  if (used >= limits.maxEvents) {
    return quotaExceeded({
      resource: 'events',
      limit: limits.maxEvents,
      used,
      message: 'Event limit reached for this organization',
    })
  }

  return null
}

export async function enforceMaxReceipts(ctx: TenantContext, now = new Date()) {
  const limits = await getOrganizationLimits(ctx.organization.id)
  if (!limits) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  if (isUnlimited(limits.maxReceiptsPerMonth)) return null

  const used = await ctx.models.Receipt.countDocuments({
    createdAt: { $gte: getRolling30DaysStart(now) },
  })

  if (used >= limits.maxReceiptsPerMonth) {
    return quotaExceeded({
      resource: 'receipts',
      limit: limits.maxReceiptsPerMonth,
      used,
      message: 'Receipt limit reached for this organization',
    })
  }

  return null
}

export async function enforceMaxUsersForInvite(params: {
  organizationId: string | mongoose.Types.ObjectId
  slotsToReserve: number
  now?: Date
}) {
  const now = params.now ?? new Date()
  const limits = await getOrganizationLimits(params.organizationId)
  if (!limits) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  if (isUnlimited(limits.maxUsers)) return null

  const usage = await getUserSlotUsage(params.organizationId, now)
  const wouldBeTotal = usage.usersTotal + params.slotsToReserve

  if (wouldBeTotal > limits.maxUsers) {
    return quotaExceeded({
      resource: 'users',
      limit: limits.maxUsers,
      used: usage.usersTotal,
      message: 'User limit reached for this organization',
    })
  }

  return null
}

export async function enforceMaxUsersForJoin(params: {
  organizationId: string | mongoose.Types.ObjectId
  now?: Date
}) {
  const now = params.now ?? new Date()
  const limits = await getOrganizationLimits(params.organizationId)
  if (!limits) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  if (isUnlimited(limits.maxUsers)) return null

  const usage = await getUserSlotUsage(params.organizationId, now)
  if (usage.usersAccepted >= limits.maxUsers) {
    return quotaExceeded({
      resource: 'users',
      limit: limits.maxUsers,
      used: usage.usersAccepted,
      message: 'User limit reached for this organization',
    })
  }

  return null
}
