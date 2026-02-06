'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  DatabaseBackup,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'

import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type BackupsHealthResponse = {
  configured: boolean
  ok: boolean
  checked: 'headBucket' | 'listBuckets' | null
  region?: string
  endpoint?: string
  bucket?: string
  error?: string
}

type BackupsRunResponse = {
  ok: boolean
  key?: string
  bytes?: number
  createdAt?: string
  orgCount?: number
  tenantCount?: number
  tenantErrors?: Array<{ slug: string; error: string }>
  error?: string
}

interface BackupsCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}))
}

export function BackupsCredenza({ open, onOpenChange }: BackupsCredenzaProps) {
  const [health, setHealth] = useState<BackupsHealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<BackupsRunResponse | null>(null)

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const response = await fetch('/api/admins/backups')
      const data = (await readJson(response)) as BackupsHealthResponse
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test backups')
      }
      setHealth(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to test backups'
      setHealth({ configured: true, ok: false, checked: null, error: message })
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void loadHealth()
    }
  }, [open, loadHealth])

  const runBackup = async () => {
    setRunning(true)
    try {
      const response = await fetch('/api/admins/backups', { method: 'POST' })
      const payload = (await readJson(response)) as BackupsRunResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Backup failed')
      }
      setLastRun(payload)
      toast.success('Backup uploaded')
      await loadHealth()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backup failed'
      setLastRun({ ok: false, error: message })
      toast.error(message)
    } finally {
      setRunning(false)
    }
  }

  const statusLabel = healthLoading
    ? 'Testing…'
    : health?.ok
      ? 'Connected'
      : health?.configured
        ? 'Error'
        : 'Not configured'

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-lg'>
        <CredenzaHeader>
          <CredenzaTitle className='flex items-center gap-2'>
            <DatabaseBackup className='w-4 h-4' />
            Backups
          </CredenzaTitle>
          <CredenzaDescription>
            Run an on-demand backup upload (Backblaze B2 S3).
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className='space-y-3'>
          <div className='rounded-md p-2 space-y-1'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm font-medium flex items-center gap-2'>
                <ShieldCheck className='w-4 h-4 text-muted-foreground' />
                Connection
              </p>
              <p className='text-sm font-semibold'>{statusLabel}</p>
            </div>

            {healthLoading ? (
              <Skeleton className='h-4 w-48' />
            ) : health?.bucket ? (
              <p className='text-xs text-muted-foreground truncate'>
                Bucket: {health.bucket}
              </p>
            ) : null}

            {!healthLoading && health?.error ? (
              <p className='text-xs text-destructive flex items-start gap-1'>
                <TriangleAlert className='w-3.5 h-3.5 mt-0.5 shrink-0' />
                <span className='line-clamp-3'>{health.error}</span>
              </p>
            ) : null}

            <div className='pt-2 flex items-center gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => void loadHealth()}
                disabled={healthLoading}
              >
                {healthLoading ? (
                  <Loader2 className='w-4 h-4 animate-spin mr-1.5' />
                ) : null}
                Re-test
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={() => void runBackup()}
                disabled={running || healthLoading || !health?.ok}
              >
                {running ? (
                  <Loader2 className='w-4 h-4 animate-spin mr-1.5' />
                ) : null}
                Run backup now
              </Button>
            </div>
            {!health?.ok && !healthLoading ? (
              <p className='text-2xs text-muted-foreground'>
                Set B2 env vars and ensure the bucket exists.
              </p>
            ) : null}
          </div>

          {lastRun ? (
            lastRun.ok ? (
              <div className='rounded-md border p-3 space-y-1'>
                <p className='text-xs text-muted-foreground'>Last upload</p>
                <p className='text-sm font-medium break-all'>{lastRun.key}</p>
                <p className='text-xs text-muted-foreground'>
                  {lastRun.bytes?.toLocaleString()} bytes •{' '}
                  {lastRun.tenantCount} tenants • {lastRun.orgCount} orgs
                </p>
                {lastRun.tenantErrors?.length ? (
                  <p className='text-xs text-destructive'>
                    {lastRun.tenantErrors.length} tenant(s) failed to dump (see
                    server logs).
                  </p>
                ) : null}
              </div>
            ) : (
              <p className='text-sm text-destructive'>{lastRun.error}</p>
            )
          ) : null}
        </CredenzaBody>

        <CredenzaFooter>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}
