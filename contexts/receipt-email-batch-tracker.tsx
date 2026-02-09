'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'

type ReceiptEmailJobItemStatus =
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'skipped'

type ReceiptEmailBatchSummary = {
  batchId: string
  total: number
  counts: Record<ReceiptEmailJobItemStatus, number>
  processed: number
  retried: number
  status: 'running' | 'completed' | 'completed_with_failures' | 'enqueue_failed'
  failedReceiptNumbers: string[]
}

type TrackedBatch = {
  batchId: string
  toastId: string
}

const STORAGE_KEY = 'receiptEmailBatches.v1'

function safeParseBatches(raw: string | null): TrackedBatch[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is TrackedBatch => {
        if (!v || typeof v !== 'object') return false
        const r = v as Record<string, unknown>
        return typeof r.batchId === 'string' && typeof r.toastId === 'string'
      })
      .slice(0, 25)
  } catch {
    return []
  }
}

function getToastId(batchId: string) {
  return `receipt-email-batch:${batchId}`
}

class BatchFetchError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function fetchBatchSummary(
  batchId: string
): Promise<ReceiptEmailBatchSummary> {
  const res = await fetch(`/api/jobs/emails/batches/${batchId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  const data = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const message =
      data?.message || data?.error || 'Failed to fetch batch status'
    throw new BatchFetchError(message, res.status)
  }
  return data as ReceiptEmailBatchSummary
}

type ReceiptEmailBatchTrackerContextValue = {
  trackBatch: (batchId: string) => void
}

const ReceiptEmailBatchTrackerContext =
  createContext<ReceiptEmailBatchTrackerContextValue | null>(null)

export function useReceiptEmailBatchTracker(): ReceiptEmailBatchTrackerContextValue {
  const value = useContext(ReceiptEmailBatchTrackerContext)
  if (!value) {
    throw new Error(
      'useReceiptEmailBatchTracker must be used within ReceiptEmailBatchTrackerProvider'
    )
  }
  return value
}

export function ReceiptEmailBatchTrackerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [batches, setBatches] = useState<TrackedBatch[]>([])
  const pollingRef = useRef(false)

  // Load from localStorage.
  useEffect(() => {
    const existing = safeParseBatches(window.localStorage.getItem(STORAGE_KEY))
    setBatches(existing)
  }, [])

  // Persist to localStorage.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(batches))
  }, [batches])

  // Sync across tabs.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setBatches(safeParseBatches(e.newValue))
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const trackBatch = useCallback((batchId: string) => {
    const trimmed = batchId.trim()
    if (!trimmed) return

    const toastId = getToastId(trimmed)

    setBatches((prev) => {
      if (prev.some((b) => b.batchId === trimmed)) return prev
      return [...prev, { batchId: trimmed, toastId }].slice(0, 25)
    })

    toast.loading('Email batch started…', {
      id: toastId,
      duration: Infinity,
    })
  }, [])

  const retryFailed = useCallback(
    async (batchId: string) => {
      const res = await fetch(`/api/jobs/emails/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_failed' }),
      })

      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || 'Failed to retry emails'
        )
      }

      const newBatchId = String(data?.jobBatchId || '').trim()
      if (newBatchId) {
        trackBatch(newBatchId)
      }

      return data
    },
    [trackBatch]
  )

  const updateToastForSummary = useCallback(
    (summary: ReceiptEmailBatchSummary) => {
      const toastId = getToastId(summary.batchId)

      if (summary.status === 'enqueue_failed') {
        toast.error('Email batch failed to enqueue', {
          id: toastId,
          duration: 10000,
        })
        return { done: true }
      }

      if (summary.status === 'completed') {
        toast.success(
          `Emails finished (${summary.counts.succeeded}/${summary.total} sent)`,
          { id: toastId, duration: 10000 }
        )
        return { done: true }
      }

      if (summary.status === 'completed_with_failures') {
        const failed = summary.counts.failed
        toast.warning(
          `Emails finished with failures (${failed}/${summary.total} failed)`,
          {
            id: toastId,
            duration: Infinity,
            action: {
              label: 'Retry failed',
              onClick: () => {
                toast.promise(retryFailed(summary.batchId), {
                  loading: 'Retrying failed emails…',
                  success: (res) => res?.message || 'Retry queued',
                  error: (err) =>
                    err instanceof Error ? err.message : 'Retry failed',
                })
              },
            },
          }
        )
        return { done: false }
      }

      // running
      const sent = summary.counts.succeeded
      const failed = summary.counts.failed
      const skipped = summary.counts.skipped
      const retried = summary.retried

      const parts = [
        `${summary.processed}/${summary.total} processed`,
        `${sent} sent`,
        failed > 0 ? `${failed} failed` : null,
        skipped > 0 ? `${skipped} skipped` : null,
        retried > 0 ? `${retried} retried` : null,
      ].filter(Boolean)

      toast.loading(`Email batch in progress: ${parts.join(' • ')}`, {
        id: toastId,
        duration: Infinity,
      })

      return { done: false }
    },
    [retryFailed]
  )

  // Poll batch statuses.
  useEffect(() => {
    if (batches.length === 0) return

    const pollOnce = async () => {
      if (pollingRef.current) return
      pollingRef.current = true

      try {
        const results = await Promise.all(
          batches.map(async (b) => {
            try {
              const summary = await fetchBatchSummary(b.batchId)
              return {
                batchId: b.batchId,
                summary,
                error: null as Error | null,
              }
            } catch (error) {
              return {
                batchId: b.batchId,
                summary: null as ReceiptEmailBatchSummary | null,
                error:
                  error instanceof Error
                    ? error
                    : new Error('Failed to fetch batch status'),
              }
            }
          })
        )

        const doneBatchIds = new Set<string>()

        for (const r of results) {
          if (r.summary) {
            const out = updateToastForSummary(r.summary)
            if (out.done) doneBatchIds.add(r.batchId)
            continue
          }

          const err = r.error
          const status = err instanceof BatchFetchError ? err.status : undefined

          // If the user is logged out / org context missing / batch is gone, stop tracking to avoid a stuck toast.
          if (status && [400, 401, 403, 404].includes(status)) {
            toast.dismiss(getToastId(r.batchId))
            doneBatchIds.add(r.batchId)
          }
        }

        if (doneBatchIds.size > 0) {
          setBatches((prev) => prev.filter((b) => !doneBatchIds.has(b.batchId)))
        }
      } finally {
        pollingRef.current = false
      }
    }

    void pollOnce()

    const id = window.setInterval(() => {
      void pollOnce()
    }, 5000)

    return () => window.clearInterval(id)
  }, [batches, updateToastForSummary])

  const value = useMemo(() => ({ trackBatch }), [trackBatch])

  return (
    <ReceiptEmailBatchTrackerContext.Provider value={value}>
      {children}
    </ReceiptEmailBatchTrackerContext.Provider>
  )
}
