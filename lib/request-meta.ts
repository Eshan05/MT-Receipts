import { nanoid } from 'nanoid'

export interface RequestMeta {
  requestId: string
  method: string
  path: string
  ip?: string
  userAgent?: string
}

function firstForwardedIp(value: string): string {
  return value.split(',')[0]?.trim() || value.trim()
}

export function getRequestMeta(request?: Request): RequestMeta {
  const requestId =
    request?.headers?.get('x-request-id') ||
    request?.headers?.get('x-vercel-id') ||
    nanoid()

  const method = request?.method || 'UNKNOWN'

  let path = 'unknown'
  try {
    if (request?.url) path = new URL(request.url).pathname
  } catch {
    // ignore
  }

  const forwardedFor =
    request?.headers?.get('x-vercel-forwarded-for') ||
    request?.headers?.get('x-forwarded-for')
  const ip = forwardedFor
    ? firstForwardedIp(forwardedFor)
    : request?.headers?.get('x-real-ip') || undefined

  const userAgent = request?.headers?.get('user-agent') || undefined

  return { requestId, method, path, ip, userAgent }
}
