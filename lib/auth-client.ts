import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { jwtVerify, type JWTPayload } from 'jose'
import type { OptionsType } from 'cookies-next'
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'PGnPIUmff+6rZ1yedUq9/W0AVl7P/KKVBS4tpWLPcW0='
)

export async function verifyAuthTokenClient(
  token: string
): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return verified.payload
  } catch (error) {
    console.error('Client-side token verification error:', error)
    return null
  }
}

export function getTokenClient(): string | undefined {
  const token = getCookie('authToken')
  if (typeof token === 'string') {
    return token
  }
  return undefined
}

export function setAuthCookieClient(
  token: string,
  options?: OptionsType
): void {
  setCookie('authToken', token, {
    // httpOnly: true,
    path: '/',
    // secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 2,
    ...options,
  })
}

export function deleteAuthCookieClient(options?: OptionsType): void {
  deleteCookie('authToken', {
    path: '/',
    ...options,
  })
}
