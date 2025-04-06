import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import SMTPVault from '@/models/smtp-vault.model'
import { encryptSmtpAppPassword } from '@/lib/smtp-vault-crypto'

function sanitizeVault(vault: {
  _id: string
  name?: string
  email: string
  isDefault: boolean
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: vault._id,
    name: vault.name,
    email: vault.email,
    isDefault: vault.isDefault,
    lastUsedAt: vault.lastUsedAt,
    createdAt: vault.createdAt,
    updatedAt: vault.updatedAt,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
    const { id } = await params
    const body = await request.json()

    const vault = await SMTPVault.findById(id)
    if (!vault) {
      return NextResponse.json(
        { message: 'SMTP vault not found' },
        { status: 404 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      updates.name = name || undefined
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

      const duplicate = await SMTPVault.findOne({
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

      updates.encryptedAppPassword = encryptSmtpAppPassword(appPassword)
    }

    if (body.isDefault === true) {
      await SMTPVault.updateMany({ isDefault: true }, { isDefault: false })
      updates.isDefault = true
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const updated = await SMTPVault.findByIdAndUpdate(id, updates, {
      new: true,
    })

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
        name: updated.name,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
    const { id } = await params

    const vault = await SMTPVault.findById(id)
    if (!vault) {
      return NextResponse.json(
        { message: 'SMTP vault not found' },
        { status: 404 }
      )
    }

    const wasDefault = vault.isDefault

    await SMTPVault.findByIdAndDelete(id)

    if (wasDefault) {
      const fallback = await SMTPVault.findOne().sort({ createdAt: 1 })
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
