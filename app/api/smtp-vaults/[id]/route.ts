import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { encryptSmtpAppPassword } from '@/lib/tenants/smtp-vault-crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

function sanitizeVault(vault: {
  _id: string
  label?: string
  email: string
  isDefault: boolean
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: vault._id,
    label: vault.label,
    email: vault.email,
    isDefault: vault.isDefault,
    lastUsedAt: vault.lastUsedAt,
    createdAt: vault.createdAt,
    updatedAt: vault.updatedAt,
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    const body = await request.json()

    const vault = await ctx.models.SMTPVault.findOne({
      _id: id,
      organizationId: ctx.organization.id,
    })

    if (!vault) {
      return NextResponse.json(
        { message: 'SMTP vault not found' },
        { status: 404 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (body.label !== undefined) {
      const label = String(body.label || '').trim()
      updates.label = label || undefined
    }

    if (body.email !== undefined) {
      const email = String(body.email || '')
        .trim()
        .toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { message: 'Invalid email address' },
          { status: 400 }
        )
      }

      const duplicate = await ctx.models.SMTPVault.findOne({
        organizationId: ctx.organization.id,
        email,
        _id: { $ne: id },
      }).lean()
      if (duplicate) {
        return NextResponse.json(
          { message: 'Another vault already uses this email' },
          { status: 409 }
        )
      }

      updates.email = email
    }

    if (body.appPassword !== undefined) {
      const appPassword = String(body.appPassword || '').trim()
      if (!appPassword) {
        return NextResponse.json(
          { message: 'App password cannot be empty' },
          { status: 400 }
        )
      }

      const { encryptedData, iv, authTag } = encryptSmtpAppPassword(appPassword)
      updates.encryptedAppPassword = encryptedData
      updates.iv = iv
      updates.authTag = authTag
    }

    if (body.isDefault === true) {
      await ctx.models.SMTPVault.updateMany(
        { organizationId: ctx.organization.id, isDefault: true },
        { isDefault: false }
      )
      updates.isDefault = true
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const updated = await ctx.models.SMTPVault.findOneAndUpdate(
      { _id: id, organizationId: ctx.organization.id },
      updates,
      { new: true }
    )

    if (!updated) {
      return NextResponse.json(
        { message: 'SMTP vault not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'SMTP vault updated successfully',
      vault: sanitizeVault({
        _id: String(updated._id),
        label: updated.label,
        email: updated.email,
        isDefault: updated.isDefault,
        lastUsedAt: updated.lastUsedAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      }),
    })
  } catch (error) {
    console.error('Error updating SMTP vault:', error)
    return NextResponse.json(
      { message: 'Failed to update SMTP vault' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext(_request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params

    const vault = await ctx.models.SMTPVault.findOne({
      _id: id,
      organizationId: ctx.organization.id,
    })

    if (!vault) {
      return NextResponse.json(
        { message: 'SMTP vault not found' },
        { status: 404 }
      )
    }

    const wasDefault = vault.isDefault

    await ctx.models.SMTPVault.findByIdAndDelete(id)

    if (wasDefault) {
      const fallback = await ctx.models.SMTPVault.findOne({
        organizationId: ctx.organization.id,
      }).sort({ createdAt: 1 })
      if (fallback) {
        fallback.isDefault = true
        await fallback.save()
      }
    }

    return NextResponse.json({ message: 'SMTP vault deleted successfully' })
  } catch (error) {
    console.error('Error deleting SMTP vault:', error)
    return NextResponse.json(
      { message: 'Failed to delete SMTP vault' },
      { status: 500 }
    )
  }
}
