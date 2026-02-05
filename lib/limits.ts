import mongoose from 'mongoose'
import Organization from '@/models/organization.model'
import MembershipRequest from '@/models/membership-request.model'
import User from '@/models/user.model'
import type { TenantModels } from '@/lib/db/tenant-models'

export interface OrganizationLimitsSnapshot {
  maxEvents: number
  maxReceiptsPerMonth: number
  maxUsers: number
}

export interface UserSlotUsage {
  usersAccepted: number
  usersPendingSlots: number
  usersTotal: number
}

export interface UsageSnapshot extends UserSlotUsage {
  eventsActive: number
  receiptsLast30Days: number
}

const DEFAULT_LIMITS: OrganizationLimitsSnapshot = {
  maxEvents: 10,
  maxReceiptsPerMonth: 100,
  maxUsers: 25,
}

export function isUnlimited(limit: number | undefined | null): boolean {
  return typeof limit !== 'number' || limit < 0
}

export function getRolling30DaysStart(now: Date = new Date()): Date {
  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  return start
}

function toObjectId(
  id: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
}

export async function getOrganizationLimits(
  organizationId: string | mongoose.Types.ObjectId
): Promise<OrganizationLimitsSnapshot | null> {
  const org = await Organization.findById(organizationId)
  if (!org) return null

  return {
    maxEvents: org.limits?.maxEvents ?? DEFAULT_LIMITS.maxEvents,
    maxReceiptsPerMonth:
      org.limits?.maxReceiptsPerMonth ?? DEFAULT_LIMITS.maxReceiptsPerMonth,
    maxUsers: org.limits?.maxUsers ?? DEFAULT_LIMITS.maxUsers,
  }
}

export async function getUserSlotUsage(
  organizationId: string | mongoose.Types.ObjectId,
  now: Date = new Date()
): Promise<UserSlotUsage> {
  const orgObjectId = toObjectId(organizationId)

  const usersAccepted = await User.countDocuments({
    memberships: { $elemMatch: { organizationId: orgObjectId } },
  })

  const validInviteFilter: Record<string, unknown> = {
    organizationId: orgObjectId,
    status: 'pending',
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  }

  const emailInvites = await MembershipRequest.countDocuments({
    ...validInviteFilter,
    type: 'email',
  })

  const codeAgg = await MembershipRequest.aggregate([
    {
      $match: {
        ...validInviteFilter,
        type: 'code',
      },
    },
    {
      $project: {
        remaining: {
          $max: [
            {
              $subtract: [
                { $ifNull: ['$maxUses', 1] },
                { $ifNull: ['$usedCount', 0] },
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        remainingSlots: { $sum: '$remaining' },
      },
    },
  ])

  const codeInviteRemainingSlots =
    (codeAgg?.[0]?.remainingSlots as number | undefined) ?? 0

  const usersPendingSlots = emailInvites + codeInviteRemainingSlots

  return {
    usersAccepted,
    usersPendingSlots,
    usersTotal: usersAccepted + usersPendingSlots,
  }
}

export async function getUsageSnapshot(params: {
  organizationId: string | mongoose.Types.ObjectId
  models: TenantModels
  now?: Date
}): Promise<UsageSnapshot> {
  const now = params.now ?? new Date()

  const [eventsActive, receiptsLast30Days, userSlots] = await Promise.all([
    params.models.Event.countDocuments({ isActive: true }),
    params.models.Receipt.countDocuments({
      createdAt: { $gte: getRolling30DaysStart(now) },
    }),
    getUserSlotUsage(params.organizationId, now),
  ])

  return {
    eventsActive,
    receiptsLast30Days,
    ...userSlots,
  }
}
