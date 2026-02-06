import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import {
  getOrganizationContext,
  type OrganizationContext,
} from '@/lib/tenants/organization-context'
import { getTenantModels, type TenantModels } from '@/lib/db/tenant-models'
import { getTokenServer, verifyAuthToken } from '@/lib/auth/auth'
import User from '@/models/user.model'

export interface TenantContext {
  organization: OrganizationContext
  models: TenantModels
  user: {
    id: string
    email: string
    username: string
    isSuperAdmin: boolean
  }
  membership: {
    role: 'admin' | 'member'
  }
}

export interface TenantRouteResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  status: number
}

export async function getTenantContext(): Promise<
  TenantContext | NextResponse
> {
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

  const organization = await getOrganizationContext()
  if (!organization) {
    return NextResponse.json(
      { error: 'Organization context not found' },
      { status: 400 }
    )
  }

  const membership = user.memberships.find(
    (m) => m.organizationSlug === organization.slug
  )
  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const models = await getTenantModels(organization.slug)

  return {
    organization,
    models,
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin || false,
    },
    membership: {
      role: membership.role,
    },
  }
}

export async function requireAdmin(
  ctx: TenantContext
): Promise<TenantContext | NextResponse> {
  if (ctx.membership.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }
  return ctx
}

export function withTenantRoute<T>(
  handler: (ctx: TenantContext) => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) {
      return ctx
    }
    return handler(ctx)
  }
}

export function withAdminRoute<T>(
  handler: (ctx: TenantContext) => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    const ctx = await getTenantContext()
    if (ctx instanceof NextResponse) {
      return ctx
    }
    const adminCheck = await requireAdmin(ctx)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
    }
    return handler(ctx)
  }
}

export async function getTenantModelsFromContext(): Promise<
  TenantModels | NextResponse
> {
  const organization = await getOrganizationContext()
  if (!organization) {
    return NextResponse.json(
      { error: 'Organization context not found' },
      { status: 400 }
    )
  }
  return getTenantModels(organization.slug)
}

export { getOrganizationContext }
