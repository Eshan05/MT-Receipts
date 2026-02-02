import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import MembershipRequest from '@/models/membership-request.model'
import Organization from '@/models/organization.model'
import mongoose from 'mongoose'

interface RouteParams {
  params: Promise<{ code: string }>
}

function isValidObjectId(id: string): boolean {
  return (
    mongoose.Types.ObjectId.isValid(id) &&
    new mongoose.Types.ObjectId(id).toString() === id
  )
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    await dbConnect()

    const upperCode = code.toUpperCase()

    let invite = await MembershipRequest.findOne({
      code: upperCode,
      status: 'pending',
    })

    if (!invite && isValidObjectId(code)) {
      invite = await MembershipRequest.findOne({
        _id: code,
        status: 'pending',
      })
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      )
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = 'expired'
      await invite.save()
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    if (
      invite.type === 'code' &&
      invite.maxUses &&
      invite.usedCount >= invite.maxUses
    ) {
      invite.status = 'accepted'
      await invite.save()
      return NextResponse.json(
        { error: 'This invite has reached its maximum uses' },
        { status: 410 }
      )
    }

    const organization = await Organization.findById(invite.organizationId)
    if (!organization || organization.status !== 'active') {
      return NextResponse.json(
        { error: 'Organization not available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: invite._id,
      type: invite.type,
      organization: {
        id: organization._id,
        slug: organization.slug,
        name: organization.name,
        logoUrl: organization.logoUrl,
        description: organization.description,
      },
      role: invite.role,
      expiresAt: invite.expiresAt,
      maxUses: invite.type === 'code' ? invite.maxUses : undefined,
      usedCount: invite.type === 'code' ? invite.usedCount : undefined,
      remainingUses:
        invite.type === 'code' && invite.maxUses
          ? invite.maxUses - invite.usedCount
          : undefined,
      createdAt: invite.createdAt,
    })
  } catch (error) {
    console.error('Get invite error:', error)
    return NextResponse.json(
      { error: 'Failed to get invite details' },
      { status: 500 }
    )
  }
}
