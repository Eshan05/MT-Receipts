import { NextResponse } from 'next/server'
import { verifyAuthToken, getTokenServer } from '@/lib/auth'

export async function GET(request: Request) {
  const token = await getTokenServer()
  if (!token || token.trim() === '' || token === undefined) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 })
  }

  const verifiedToken = await verifyAuthToken(token)
  if (!verifiedToken)
    return NextResponse.json({ isAuthenticated: false }, { status: 401 })

  return NextResponse.json({ isAuthenticated: true }, { status: 200 })
}
