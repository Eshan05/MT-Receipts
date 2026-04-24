'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ParsedTarget =
  | { ok: true; receiptNumber: string; organizationSlug?: string }
  | { ok: false; error: string }

function normalizeSegments(value: string): string[] {
  return value
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseCertificateInput(raw: string): ParsedTarget {
  const value = raw.trim()
  if (!value) return { ok: false, error: 'Enter a certificate ID.' }

  const tryParsePath = (pathname: string): ParsedTarget => {
    const segments = normalizeSegments(pathname)

    if (segments.length >= 1 && segments[0] === 'v') {
      if (segments.length === 2) {
        return { ok: true, receiptNumber: segments[1] }
      }
      if (segments.length === 3) {
        return {
          ok: true,
          organizationSlug: segments[1],
          receiptNumber: segments[2],
        }
      }
      return { ok: false, error: 'Unsupported verification link format.' }
    }

    if (segments.length === 1) {
      return { ok: true, receiptNumber: segments[0] }
    }

    if (segments.length === 2) {
      return {
        ok: true,
        organizationSlug: segments[0],
        receiptNumber: segments[1],
      }
    }

    return { ok: false, error: 'Unsupported certificate format.' }
  }

  // Full URL pasted
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      return tryParsePath(url.pathname)
    } catch {
      return { ok: false, error: 'Invalid URL.' }
    }
  }

  // Relative path pasted
  if (value.startsWith('/')) {
    return tryParsePath(value)
  }

  return tryParsePath(value)
}

export default function VerifyForm({
  defaultOrganizationSlug,
}: {
  defaultOrganizationSlug?: string
}) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const helperText = useMemo(() => {
    return 'Examples: RCP-2026-00001 • aces/RCP-2026-00001 • https://yourdomain/v/aces/RCP-2026-00001'
  }, [])

  return (
    <form
      className='space-y-2'
      onSubmit={async (e) => {
        e.preventDefault()
        const parsed = parseCertificateInput(input)
        if (!parsed.ok) {
          setError(parsed.error)
          return
        }

        setError(null)

        const receiptNumber = encodeURIComponent(parsed.receiptNumber)
        const resolvedOrganizationSlug =
          parsed.organizationSlug || defaultOrganizationSlug

        if (resolvedOrganizationSlug) {
          const organizationSlug = encodeURIComponent(resolvedOrganizationSlug)
          router.push(`/v/${organizationSlug}/${receiptNumber}`)
          return
        }

        try {
          setIsLoading(true)
          const res = await fetch(
            `/api/verify?certificateId=${encodeURIComponent(
              parsed.receiptNumber
            )}`,
            { method: 'GET', headers: { accept: 'application/json' } }
          )

          const data = (await res.json().catch(() => null)) as {
            ok?: boolean
            message?: string
            organizationSlug?: string
            receiptNumber?: string
          } | null

          if (!res.ok || !data?.ok || !data.organizationSlug) {
            setError(data?.message || 'Certificate not found.')
            return
          }

          router.push(
            `/v/${encodeURIComponent(data.organizationSlug)}/${encodeURIComponent(
              data.receiptNumber || parsed.receiptNumber
            )}`
          )
        } catch {
          setError('Failed to verify certificate.')
        } finally {
          setIsLoading(false)
        }
      }}
    >
      <div className='flex flex-col gap-2 sm:flex-row'>
        <div className='flex-1'>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Certificate ID (or verification link)'
            aria-label='Certificate ID'
            autoComplete='off'
            disabled={isLoading}
          />
        </div>
        <Button type='submit' className='sm:w-auto' disabled={isLoading}>
          Verify
        </Button>
      </div>

      {/* <div className='text-xs text-muted-foreground'>{helperText}</div> */}
      {error && <div className='text-xs text-destructive'>{error}</div>}
    </form>
  )
}
