'use client'

import useSWRInfinite from 'swr/infinite'
import { useMemo, useCallback } from 'react'
import { IEvent } from '@/models/event.model'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface EventsResponse {
  events: IEvent[]
  nextCursor: string | null
  hasMore: boolean
}

interface UseInfiniteEventsOptions {
  includeDeleted?: boolean
}

interface UseInfiniteEventsReturn {
  events: IEvent[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  mutate: () => Promise<unknown>
  error: Error | undefined
}

const fetcher = async (url: string): Promise<EventsResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch events')
  }
  return res.json()
}

export function useInfiniteEvents(
  options: UseInfiniteEventsOptions = {}
): UseInfiniteEventsReturn {
  const { includeDeleted = false } = options

  const { currentOrganization } = useAuth()
  const params = useParams()
  const tenantSlug = (params?.slug as string | undefined) || undefined
  const cacheTenantSlug = tenantSlug ?? currentOrganization?.slug

  const getKey = useCallback(
    (pageIndex: number, previousPageData: EventsResponse | null) => {
      if (previousPageData && !previousPageData.hasMore) return null

      const params = new URLSearchParams()
      params.set('limit', '12')
      if (includeDeleted) params.set('includeDeleted', 'true')
      // Key-segmentation only: the API reads the active tenant from cookies.
      if (cacheTenantSlug) params.set('tenantSlug', cacheTenantSlug)
      if (pageIndex > 0 && previousPageData?.nextCursor) {
        params.set('cursor', previousPageData.nextCursor)
      }

      return `/api/events?${params.toString()}`
    },
    [includeDeleted, cacheTenantSlug]
  )

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<EventsResponse>(getKey, fetcher, {
      revalidateFirstPage: false,
      revalidateAll: false,
      persistSize: false,
    })

  const events = useMemo(() => {
    if (!data) return []
    return data.flatMap((page) => page.events)
  }, [data])

  const hasMore: boolean = useMemo(() => {
    if (!data || data.length === 0) return false
    return data[data.length - 1]?.hasMore ?? false
  }, [data])

  const isLoadingMore: boolean = useMemo(() => {
    if (isLoading) return true
    if (!data) return false
    return size > 0 && typeof data[size - 1] === 'undefined'
  }, [isLoading, size, data])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setSize(size + 1)
    }
  }, [hasMore, isLoadingMore, setSize, size])

  return {
    events,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate,
    error: error ?? undefined,
  }
}
