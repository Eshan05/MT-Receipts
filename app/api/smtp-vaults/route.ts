import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import SMTPVault from '@/models/smtp-vault.model'
import { encryptSmtpAppPassword } from '@/lib/smtp-vault-crypto'

function sanitizeVault(vault: {
  _id: string
  name: string
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

export async function GET() {
  try {
    await dbConnect()

    const vaults = await SMTPVault.find().sort({ isDefault: -1, createdAt: -1 })

    return NextResponse.json({
      vaults: vaults.map((vault) =>
        sanitizeVault({
          _id: String(vault._id),
          name: vault.name,
          email: vault.email,
          isDefault: vault.isDefault,
          lastUsedAt: vault.lastUsedAt,
          createdAt: vault.createdAt,
          updatedAt: vault.updatedAt,
        })
      ),
    })
  } catch (error) {
    console.error('Error fetching SMTP vaults:', error)
    return NextResponse.json(
      { message: 'Failed to fetch SMTP vaults' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()

    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const name = String(body.senderName || '').trim()
    const appPassword = String(body.appPassword || '').trim()
    const requestedDefault = Boolean(body.isDefault)

    if (!email || !appPassword) {
      return NextResponse.json(
        { message: 'Email and app password are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      )
    }

    const existing = await SMTPVault.findOne({ email }).lean()
    if (existing) {
      return NextResponse.json(
        { message: 'This email is already in your vault' },
        { status: 409 }
      )
    }

    const vaultCount = await SMTPVault.countDocuments()
    const isDefault = requestedDefault || vaultCount === 0

    if (isDefault) {
      await SMTPVault.updateMany({ isDefault: true }, { isDefault: false })
    }

    const vault = await SMTPVault.create({
      name: name || undefined,
      email,
      encryptedAppPassword: encryptSmtpAppPassword(appPassword),
      isDefault,
    })

    return NextResponse.json(
      {
        message: 'SMTP vault created successfully',
        vault: sanitizeVault({
          _id: String(vault._id),
          name: vault.name,
          email: vault.email,
          isDefault: vault.isDefault,
          lastUsedAt: vault.lastUsedAt,
          createdAt: vault.createdAt,
          updatedAt: vault.updatedAt,
        }),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating SMTP vault:', error)
    return NextResponse.json(
      { message: 'Failed to create SMTP vault' },
      { status: 500 }
    )
  }
}
