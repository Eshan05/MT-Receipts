import { Client } from '@upstash/qstash'
import { siteConfig } from '@/lib/site'

function isLoopbackBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl)
    const hostname = url.hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    )
  } catch {
    return true
  }
}

function canQstashDeliverToLoopbackTargets(): boolean {
  const qstashUrl = process.env.QSTASH_URL
  if (!qstashUrl) return false
  return isLoopbackBaseUrl(qstashUrl)
}

export function isQstashConfigured(): boolean {
  const baseUrl = siteConfig.url
  const baseIsLoopback = baseUrl ? isLoopbackBaseUrl(baseUrl) : true
  const loopbackAllowed = !baseIsLoopback || canQstashDeliverToLoopbackTargets()
  return Boolean(
    process.env.QSTASH_TOKEN &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    baseUrl &&
    loopbackAllowed
  )
}

export function getQstashSigningConfig(): {
  currentSigningKey?: string
  nextSigningKey?: string
  clockTolerance?: number
} {
  return {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    clockTolerance: 5,
  }
}

let clientSingleton: Client | null = null

export function getQstashClient(): Client {
  if (clientSingleton) return clientSingleton

  const token = process.env.QSTASH_TOKEN
  if (!token) {
    throw new Error('QStash is not configured: missing QSTASH_TOKEN')
  }

  clientSingleton = new Client({ token })
  return clientSingleton
}

export function getAbsoluteJobUrl(pathname: string): string {
  const base = siteConfig.url
  if (!base) {
    throw new Error('Unable to resolve base URL for QStash job target')
  }
  if (isLoopbackBaseUrl(base) && !canQstashDeliverToLoopbackTargets()) {
    throw new Error(
      `Invalid QStash base URL: ${base}. QStash cannot deliver to localhost/loopback addresses.`
    )
  }
  return new URL(pathname, base).toString()
}
