'use server'

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'PGnPIUmff+6rZ1yedUq9/W0AVl7P/KKVBS4tpWLPcW0='
)
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET')

const CURRENT_ORG_COOKIE = 'currentOrganization'

export async function createSessionToken(email: string): Promise<string> {
  const payload: JWTPayload = {
    email: email,
    jti: nanoid(),
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret)

  return token
}

export async function verifyAuthToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return verified.payload
  } catch (error) {
    console.error('Token V error:', error)
    return null
  }
}

export async function getTokenServer(): Promise<string | undefined> {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('authToken')
  return authToken?.value
}

export async function setAuthCookie(email: string, response: NextResponse) {
  const token = await createSessionToken(email)
  response.cookies.set({
    name: 'authToken',
    value: token,
    path: '/',
    // secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
  })
}

export async function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: 'authToken',
    value: '',
    path: '/',
    maxAge: 0,
  })
}

export async function getCurrentOrgSlug(): Promise<string | undefined> {
  const cookieStore = await cookies()
  const orgCookie = cookieStore.get(CURRENT_ORG_COOKIE)
  return orgCookie?.value
}

export async function setCurrentOrgCookie(
  orgSlug: string,
  response: NextResponse
) {
  response.cookies.set({
    name: CURRENT_ORG_COOKIE,
    value: orgSlug,
    path: '/',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearCurrentOrgCookie(response: NextResponse) {
  response.cookies.set({
    name: CURRENT_ORG_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
  })
}
