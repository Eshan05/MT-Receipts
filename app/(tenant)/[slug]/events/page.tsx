'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from '@/components/ui/credenza'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { cn, formatDate } from '@/lib/utils'
import { IEvent } from '@/models/event.model'
import { defaultIcons, iconMap, typeIcons, typeStyles } from '@/utils/mappings'
import {
  ArrowDownAz,
  ArrowDownZa,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Download,
  Filter,
  Link2,
  LinkIcon,
  Loader2,
  MoreVertical,
  Package,
  Pencil,
  PlusCircle,
  RotateCcw,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type { IconType } from 'react-icons'
import { toast } from 'sonner'
import { EventForm } from '../../../../components/forms/event-form'
import {
  EventFilters as EventFiltersComponent,
  type EventFilters,
} from '../../../../components/forms/event-filters'
import { useInfiniteEvents } from '@/hooks/use-infinite-events'

type SortOption =
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'name-asc'
  | 'name-desc'
  | 'items-desc'
  | 'items-asc'

const sortOptions: { value: SortOption; label: string; icon: IconType }[] = [
  { value: 'createdAt-desc', label: 'Newest First', icon: Calendar },
  { value: 'createdAt-asc', label: 'Oldest First', icon: Calendar },
  { value: 'name-asc', label: 'Name (A-Z)', icon: ArrowDownAz },
  { value: 'name-desc', label: 'Name (Z-A)', icon: ArrowDownZa },
  { value: 'items-desc', label: 'Most Items', icon: Package },
  { value: 'items-asc', label: 'Fewest Items', icon: Package },
]

interface ItemCounts {
  [eventId: string]: {
    [itemName: string]: number
  }
}

interface EntryCounts {
  [eventId: string]: number
}

export default function EventsPage() {
  const params = useParams()
  const slug = params.slug as string

  const [itemCounts, setItemCounts] = useState<ItemCounts>({})
  const [entryCounts, setEntryCounts] = useState<EntryCounts>({})
  const [open, setOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<IEvent | null>(null)
  const [deleteEvent, setDeleteEvent] = useState<IEvent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    types: [],
    tags: [],
    minItems: '',
    maxItems: '',
    minPrice: '',
    maxPrice: '',
    startDateAfter: undefined,
    startDateBefore: undefined,
    includeDeleted: false,
  })
  const [sortBy, setSortBy] = useState<SortOption>('createdAt-desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false)
  const [bulkTypeOpen, setBulkTypeOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [bulkOperating, setBulkOperating] = useState(false)

  const {
    events,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate: mutateEvents,
  } = useInfiniteEvents({ includeDeleted: filters.includeDeleted })

  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    const fetchItemCounts = async () => {
      const eventIds = events.map((e) => e._id?.toString()).filter(Boolean)
      if (eventIds.length > 0) {
        try {
          const countsResponse = await fetch(
            `/api/events/items?eventIds=${eventIds.join(',')}`
          )
          if (countsResponse.ok) {
            const countsData = await countsResponse.json()
            setItemCounts(countsData.counts)
          }
        } catch (error) {
          console.error('Error fetching item counts:', error)
        }
      }
    }

    const fetchEntryCounts = async () => {
      const eventIds = events.map((e) => e._id?.toString()).filter(Boolean)
      if (eventIds.length > 0) {
        try {
          const countsResponse = await fetch(
            `/api/events/entries-count?eventIds=${eventIds.join(',')}`
          )
          if (countsResponse.ok) {
            const countsData = await countsResponse.json()
            setEntryCounts(countsData.counts)
          }
        } catch (error) {
          console.error('Error fetching entry counts:', error)
        }
      }
    }

    if (events.length > 0) {
      fetchItemCounts()
      fetchEntryCounts()
    }
  }, [events])

  const handleEventCreated = (newEvent: IEvent) => {
    mutateEvents()
    setOpen(false)
    toast.success(`Event "${newEvent.name}" created successfully!`)
  }

  const handleEventUpdated = (updatedEvent: IEvent) => {
    mutateEvents()
    setEditEvent(null)
    toast.success(`Event "${updatedEvent.name}" updated successfully!`)
  }

  const openEditDialog = (e: React.MouseEvent, event: IEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditEvent(event)
  }

  const openDeleteDialog = (e: React.MouseEvent, event: IEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteEvent(event)
  }

  const handleDeleteEvent = async () => {
    if (!deleteEvent) return
    toast.promise(
      fetch(`/api/events/${deleteEvent.eventCode}`, {
        method: 'DELETE',
      }).then(async (response) => {
        if (!response.ok) throw new Error('Failed to delete event')
        return response.json()
      }),
      {
        loading: `Deleting "${deleteEvent.name}"...`,
        success: () => {
          setDeleteEvent(null)
          mutateEvents()
          return `Event "${deleteEvent.name}" deleted`
        },
        error: 'Failed to delete event',
      }
    )
  }

  const handleRestoreEvent = async (e: React.MouseEvent, event: IEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast.promise(
      fetch(`/api/events/${event.eventCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      }).then(async (response) => {
        if (!response.ok) throw new Error('Failed to restore event')
        return response.json()
      }),
      {
        loading: `Restoring "${event.name}"...`,
        success: () => {
          mutateEvents()
          return `Event "${event.name}" restored`
        },
        error: 'Failed to restore event',
      }
    )
  }

  const handleShareEvent = (e: React.MouseEvent, event: IEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/${slug}/events/${event.eventCode}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    events.forEach((event) => {
      event.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesName = event.name.toLowerCase().includes(searchLower)
        const matchesDesc = event.desc?.toLowerCase().includes(searchLower)
        const matchesCode = event.eventCode.toLowerCase().includes(searchLower)
        if (!matchesName && !matchesDesc && !matchesCode) {
          return false
        }
      }

      if (filters.types.length > 0 && !filters.types.includes(event.type)) {
        return false
      }

      if (filters.tags.length > 0) {
        const eventTags = event.tags || []
        if (!filters.tags.some((tag) => eventTags.includes(tag))) {
          return false
        }
      }

      if (filters.minItems !== '') {
        const min = parseInt(filters.minItems, 10)
        if (!isNaN(min) && event.items.length < min) {
          return false
        }
      }

      if (filters.maxItems !== '') {
        const max = parseInt(filters.maxItems, 10)
        if (!isNaN(max) && event.items.length > max) {
          return false
        }
      }

      if (filters.minPrice !== '' || filters.maxPrice !== '') {
        const minPrice =
          filters.minPrice !== '' ? parseFloat(filters.minPrice) : 0
        const maxPrice =
          filters.maxPrice !== '' ? parseFloat(filters.maxPrice) : Infinity
        if (!isNaN(minPrice) || !isNaN(maxPrice)) {
          const hasItemInRange = event.items.some((item) => {
            const price = item.price
            return price >= minPrice && price <= maxPrice
          })
          if (!hasItemInRange) {
            return false
          }
        }
      }

      if (filters.startDateAfter && event.startDate) {
        if (new Date(event.startDate) < filters.startDateAfter) {
          return false
        }
      }

      if (filters.startDateBefore && event.startDate) {
        if (new Date(event.startDate) > filters.startDateBefore) {
          return false
        }
      }

      return true
    })
  }, [events, filters])

  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents]
    switch (sortBy) {
      case 'createdAt-desc':
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      case 'createdAt-asc':
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'items-desc':
        return sorted.sort((a, b) => b.items.length - a.items.length)
      case 'items-asc':
        return sorted.sort((a, b) => a.items.length - b.items.length)
      default:
        return sorted
    }
  }, [filteredEvents, sortBy])

  const hasActiveFilters =
    filters.search !== '' ||
    filters.types.length > 0 ||
    filters.tags.length > 0 ||
    filters.minItems !== '' ||
    filters.maxItems !== '' ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.startDateAfter !== undefined ||
    filters.startDateBefore !== undefined ||
    filters.includeDeleted

  const toggleSelection = useCallback((eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedEvents = useMemo(() => {
    return events.filter((e) => selectedIds.has(e._id?.toString() || ''))
  }, [events, selectedIds])

  const hasDeletedSelected = selectedEvents.some((e) => !e.isActive)
  const hasActiveSelected = selectedEvents.some((e) => e.isActive)

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    toast.promise(
      Promise.all(
        ids.map((id) => {
          const event = events.find((e) => e._id?.toString() === id)
          if (event && event.isActive) {
            return fetch(`/api/events/${event.eventCode}`, { method: 'DELETE' })
          }
          return Promise.resolve()
        })
      ),
      {
        loading: `Deleting ${ids.length} event(s)...`,
        success: () => {
          clearSelection()
          mutateEvents()
          return `${ids.length} event(s) deleted`
        },
        error: 'Failed to delete events',
      }
    )
  }

  const bulkRestore = async () => {
    const ids = Array.from(selectedIds)
    toast.promise(
      Promise.all(
        ids.map((id) => {
          const event = events.find((e) => e._id?.toString() === id)
          if (event && !event.isActive) {
            return fetch(`/api/events/${event.eventCode}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: true }),
            })
          }
          return Promise.resolve()
        })
      ),
      {
        loading: `Restoring ${ids.length} event(s)...`,
        success: () => {
          clearSelection()
          mutateEvents()
          return `${ids.length} event(s) restored`
        },
        error: 'Failed to restore events',
      }
    )
  }

  const bulkChangeType = async (newType: string) => {
    const ids = Array.from(selectedIds)
    toast.promise(
      Promise.all(
        ids.map((id) => {
          const event = events.find((e) => e._id?.toString() === id)
          if (event) {
            return fetch(`/api/events/${event.eventCode}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: event.name,
                type: newType,
                desc: event.desc,
                items: event.items,
              }),
            })
          }
          return Promise.resolve()
        })
      ),
      {
        loading: `Changing type to "${newType}"...`,
        success: () => {
          clearSelection()
          mutateEvents()
          return `Changed type to "${newType}" for ${ids.length} event(s)`
        },
        error: 'Failed to change event types',
      }
    )
  }

  const bulkAddTag = async () => {
    const tag = newTag.trim()
    if (!tag) return
    setBulkOperating(true)
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(
        ids.map((id) => {
          const event = events.find((e) => e._id?.toString() === id)
          if (event) {
            const currentTags = event.tags || []
            const updatedTags = [...new Set([...currentTags, tag])]
            return fetch(`/api/events/${event.eventCode}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: event.name,
                type: event.type,
                desc: event.desc,
                items: event.items,
                tags: updatedTags,
              }),
            })
          }
          return Promise.resolve()
        })
      )
      toast.success(`Added tag "${tag}" to ${ids.length} event(s)`)
      setNewTag('')
      clearSelection()
      mutateEvents()
    } catch {
      toast.error('Failed to add tag')
    } finally {
      setBulkOperating(false)
    }
  }

  const bulkRemoveTag = async () => {
    const tag = newTag.trim()
    if (!tag) return
    setBulkOperating(true)
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(
        ids.map((id) => {
          const event = events.find((e) => e._id?.toString() === id)
          if (event) {
            const currentTags = event.tags || []
            const updatedTags = currentTags.filter((t) => t !== tag)
            return fetch(`/api/events/${event.eventCode}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: event.name,
                type: event.type,
                desc: event.desc,
                items: event.items,
                tags: updatedTags,
              }),
            })
          }
          return Promise.resolve()
        })
      )
      toast.success(`Removed tag "${tag}" from ${ids.length} event(s)`)
      setNewTag('')
      clearSelection()
      mutateEvents()
    } catch {
      toast.error('Failed to remove tag')
    } finally {
      setBulkOperating(false)
    }
  }

  const bulkExport = () => {
    const exportData = selectedEvents.map((event) => ({
      eventCode: event.eventCode,
      name: event.name,
      type: event.type,
      description: event.desc || '',
      items: event.items.map((i) => `${i.name} ($${i.price})`).join('; '),
      tags: (event.tags || []).join(', '),
      createdAt: formatDate(new Date(event.createdAt)),
      isActive: event.isActive,
    }))

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map((row) =>
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `events-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selectedEvents.length} event(s)`)
  }

  return (
    <div className='container py-2 pb-24'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl font-semibold shadow-heading'>Events</h1>
          <div className='flex items-center gap-2 flex-wrap justify-end'>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className='w-40 h-8 text-xs'>
                <ArrowUpDown className='w-3 h-3 mr-1' />
                <SelectValue placeholder='Sort by' />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className='flex items-center gap-1.5'>
                        <Icon className='w-3 h-3' />
                        {option.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className='w-4 h-4' />
              Filters
              {hasActiveFilters && (
                <span className='w-2 h-2 rounded-full bg-primary' />
              )}
            </Button>
            <Credenza open={open} onOpenChange={setOpen}>
              <CredenzaTrigger asChild>
                <Button size='sm' className='gap-1.5'>
                  <PlusCircle className='w-4 h-4' />
                  Create
                </Button>
              </CredenzaTrigger>
              <CredenzaContent>
                <CredenzaHeader>
                  <CredenzaTitle>New Event</CredenzaTitle>
                </CredenzaHeader>
                <CredenzaBody>
                  <EventForm
                    onSuccess={handleEventCreated}
                    onCancel={() => setOpen(false)}
                  />
                </CredenzaBody>
              </CredenzaContent>
            </Credenza>
          </div>
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          All the events / campaigns are listed below, you can filter as per
          your needs. Hover over the packages icon to see items within an event.
          Click to go to event page
        </p>
      </header>
      {isLoading ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className='animate-pulse rounded-lg bg-muted/30 h-32'
            />
          ))}
        </div>
      ) : sortedEvents.length > 0 ? (
        <>
          <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
            {sortedEvents.map((event) => (
              <EventCard
                key={event._id?.toString()}
                event={event}
                orgSlug={slug}
                itemCounts={itemCounts[event._id?.toString() || ''] || {}}
                entryCount={entryCounts[event._id?.toString() || ''] || 0}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onShare={handleShareEvent}
                onRestore={handleRestoreEvent}
                isSelected={selectedIds.has(event._id?.toString() || '')}
                onToggleSelect={toggleSelection}
              />
            ))}
          </div>
          <div ref={loadMoreRef} className='flex justify-center py-8'>
            {isLoadingMore && (
              <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
            )}
          </div>
        </>
      ) : events.length > 0 ? (
        <div className='text-center py-12'>
          <p className='text-muted-foreground mb-4'>
            No events match your filters
          </p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setFiltersOpen(true)}
          >
            Adjust Filters
          </Button>
        </div>
      ) : (
        <div className='text-center py-12'>
          <p className='text-muted-foreground mb-4'>No events yet</p>
          <Button size='sm' onClick={() => setOpen(true)}>
            Create one
          </Button>
        </div>
      )}

      <Credenza
        open={!!editEvent}
        onOpenChange={(open) => !open && setEditEvent(null)}
      >
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Edit Event</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody>
            {editEvent && (
              <EventForm
                onSuccess={handleEventUpdated}
                onCancel={() => setEditEvent(null)}
                event={editEvent}
              />
            )}
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>

      <Credenza
        open={!!deleteEvent}
        onOpenChange={(open) => !open && setDeleteEvent(null)}
      >
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Delete Event</CredenzaTitle>
            <CredenzaDescription>
              Are you sure you want to delete "{deleteEvent?.name}"? You can
              restore it later by enabling "Include Deleted" in filters.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaFooter>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setDeleteEvent(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleDeleteEvent}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>

      <Credenza open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Filter Events</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody className='overflow-y-auto max-sm:pb-6 no-scrollbar'>
            <EventFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              availableTags={availableTags}
            />
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>

      {selectedIds.size > 0 && (
        <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-max max-w-xl rounded-xl border bg-background/95 backdrop-blur shadow-lg px-3 py-2'>
          <div className='flex items-center gap-1 overflow-x-auto no-scrollbar'>
            <Badge variant='secondary' className='shrink-0'>
              {selectedIds.size}
              <span className='hidden sm:inline'>selected</span>
            </Badge>
            <div className='h-4 w-px bg-border ml-1 shrink-0' />
            <Button
              size='sm'
              variant='ghost'
              className='px-2'
              onClick={clearSelection}
            >
              <X className='w-4 h-4 sm:mr-1' />
              <span className='hidden sm:inline'>Clear</span>
            </Button>
            <div className='h-4 w-px bg-border shrink-0' />
            <div className='flex items-center gap-1'>
              <Popover open={bulkTypeOpen} onOpenChange={setBulkTypeOpen}>
                <PopoverTrigger asChild>
                  <Button size='sm' variant='ghost' className='px-2'>
                    <Pencil className='w-4 h-4 sm:mr-1' />
                    <span className='hidden sm:inline'>Type</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-3xs p-2' align='end'>
                  <div className='space-y-2'>
                    <p className='text-xs font-medium'>Change Type</p>
                    <div className='grid grid-cols-2 gap-1'>
                      {Object.keys(typeIcons).map((type) => {
                        const Icon = typeIcons[type]
                        const style = typeStyles[type] || typeStyles.other
                        return (
                          <Button
                            key={type}
                            size='sm'
                            variant='outline'
                            className='justify-start text-xs h-7'
                            onClick={() => {
                              bulkChangeType(type)
                              setBulkTypeOpen(false)
                            }}
                            disabled={bulkOperating}
                          >
                            <Icon className={cn('w-3 h-3 mr-1', style.text)} />
                            <span className='capitalize'>{type}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={bulkTagsOpen} onOpenChange={setBulkTagsOpen}>
                <PopoverTrigger asChild>
                  <Button size='sm' variant='ghost' className='px-2'>
                    <Tag className='w-4 h-4 sm:mr-1' />
                    <span className='hidden sm:inline'>Tags</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-64 p-4' align='end'>
                  <div className='space-y-2'>
                    <div className=''>
                      <h4 className='font-medium'>Manage Tags</h4>
                      <p className='text-2xs text-muted-foreground'>
                        Add or remove tags from selected items.
                      </p>
                    </div>
                    <div className='space-y-2'>
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder='Tag name...'
                        onKeyDown={(e) => e.key === 'Enter' && bulkAddTag()}
                      />
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='flex-1'
                          onClick={bulkRemoveTag}
                          disabled={bulkOperating}
                        >
                          Remove
                        </Button>
                        <Button
                          size='sm'
                          className='flex-1'
                          onClick={bulkAddTag}
                          disabled={bulkOperating}
                        >
                          Add
                        </Button>
                      </div>
                      {availableTags.length > 0 && (
                        <div className='space-y-2'>
                          <p className='text-xs text-muted-foreground'>
                            Existing tags
                          </p>
                          <div className='flex flex-wrap gap-1'>
                            {availableTags.slice(0, 8).map((t) => (
                              <button
                                key={t}
                                type='button'
                                className='inline-flex items-center rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted'
                                onClick={() => setNewTag(t)}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size='sm'
                variant='ghost'
                className='px-2'
                onClick={bulkExport}
              >
                <Download className='w-4 h-4 sm:mr-1' />
                <span className='hidden sm:inline'>Export</span>
              </Button>
              {hasDeletedSelected && (
                <Button
                  size='sm'
                  variant='ghost'
                  className='px-2'
                  onClick={bulkRestore}
                  disabled={bulkOperating}
                >
                  <RotateCcw className='w-4 h-4 sm:mr-1' />
                  <span className='hidden sm:inline'>Restore</span>
                </Button>
              )}
              {hasActiveSelected && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='px-2 text-destructive hover:text-destructive hover:bg-destructive/10'
                    >
                      <Trash2 className='w-4 h-4 sm:mr-1' />
                      <span className='hidden sm:inline'>Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Events</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedIds.size}{' '}
                        event(s)? You can restore them later by enabling
                        &quot;Include Deleted&quot; in filters.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-destructive text-white hover:bg-destructive/90'
                        onClick={bulkDelete}
                        disabled={bulkOperating}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({
  event,
  orgSlug,
  itemCounts,
  entryCount,
  onEdit,
  onDelete,
  onShare,
  onRestore,
  isSelected,
  onToggleSelect,
}: {
  event: IEvent
  orgSlug: string
  itemCounts: Record<string, number>
  entryCount: number
  onEdit: (e: React.MouseEvent, event: IEvent) => void
  onDelete: (e: React.MouseEvent, event: IEvent) => void
  onShare: (e: React.MouseEvent, event: IEvent) => void
  onRestore: (e: React.MouseEvent, event: IEvent) => void
  isSelected: boolean
  onToggleSelect: (eventId: string) => void
}) {
  const style = typeStyles[event.type] || typeStyles.other
  const TypeIcon = typeIcons[event.type] || Package
  const EventIcon = getEventIcon(event.name)
  const isDeleted = !event.isActive

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors',
        'border-l-2 relative',
        style.border,
        isDeleted && 'opacity-60',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      <div
        className='absolute top-2 left-2 z-10'
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(event._id?.toString() || '')}
          className='bg-background'
        />
      </div>
      <Link
        href={`${orgSlug}/events/${event.eventCode}`}
        className='group block'
      >
        <div
          className={cn(
            'px-3 py-1.5 flex items-center justify-between pl-10',
            style.bg
          )}
        >
          <div className='flex items-center gap-1.5'>
            <TypeIcon className={cn('w-3.5 h-3.5', style.text)} />
            <span className={cn('text-xs font-medium capitalize', style.text)}>
              {event.type}
            </span>
            {isDeleted && (
              <span className='text-tiny px-1.5 py-0.5 rounded bg-destructive/20 text-destructive'>
                Deleted
              </span>
            )}
          </div>
          <div
            className='flex items-center gap-1'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  size='none'
                  variant='unstyled'
                  className='p-0.5 hover:bg-background/50 rounded'
                >
                  <MoreVertical className='w-2 h-2 text-muted-foreground' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-40 text-xs!'>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className=''>
                    <Package className='size-3' />
                    Items
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className='w-56 text-sm p-0'>
                    <div className='px-2 py-1.5 border-b border-border/50'>
                      <p className='text-xs font-medium'>Items</p>
                    </div>
                    <div className='p-0'>
                      {event.items.map((item, idx) => {
                        const ItemIcon = getEventIcon(item.name)
                        const soldCount = itemCounts[item.name] || 0
                        return (
                          <div
                            key={idx}
                            className='px-2 py-1 flex items-center gap-1.5 hover:bg-muted/50'
                          >
                            <ItemIcon className='w-3 h-3 text-muted-foreground shrink-0' />
                            <span className='text-2xs flex-1 truncate'>
                              {item.name}
                            </span>
                            <span className='text-tiny text-muted-foreground font-mono'>
                              ${item.price}
                            </span>
                            <span className='text-tiny text-muted-foreground flex items-center gap-0.5'>
                              <Users className='w-2.5 h-2.5' />
                              {soldCount}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={(e) => onEdit(e, event)}
                  className='h-6'
                >
                  <Pencil className='size-3' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => onShare(e, event)}
                  className='h-6'
                >
                  <LinkIcon className='size-3' />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isDeleted ? (
                  <DropdownMenuItem
                    onClick={(e) => onRestore(e, event)}
                    className='h-6'
                  >
                    <RotateCcw className='size-3' />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => onDelete(e, event)}
                    className='text-destructive focus:text-destructive h-6'
                  >
                    <Trash2 className='size-3' />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className='text-tiny text-muted-foreground font-mono'>
              {event.eventCode}
            </span>
          </div>
        </div>

        <div className='p-3'>
          <div className='flex items-start gap-2.5'>
            <div className='mt-0.5 p-1.5 rounded-md bg-background'>
              <EventIcon className='w-4 h-4 text-muted-foreground' />
            </div>
            <div className='flex-1 min-w-0'>
              <h3 className='font-medium text-sm truncate'>{event.name}</h3>
              <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
                {event.desc || 'No description'}
              </p>
            </div>
          </div>

          <div className='flex items-center justify-between mt-3 pt-2 border-t border-border/30'>
            <div
              className='flex items-center gap-3 text-2xs text-muted-foreground'
              onClick={(e) => e.preventDefault()}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    size={'none'}
                    onClick={(e) => e.nativeEvent.stopImmediatePropagation()}
                    variant={'unstyled'}
                    className='flex items-center gap-1 hover:text-foreground transition-colors'
                  >
                    <Package className='w-3 h-3' />
                    {event.items.length}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align='start' className='w-56 p-1.5 gap-2'>
                  <div className='px-2 py-1.5 border-b border-border/50'>
                    <p className='text-xs font-medium'>Items</p>
                  </div>
                  <div className=''>
                    {event.items.map((item, idx) => {
                      const ItemIcon = getEventIcon(item.name)
                      const soldCount = itemCounts[item.name] || 0
                      return (
                        <div
                          key={idx}
                          className='px-2 py-1 flex items-center gap-1.5 rounded hover:bg-muted/50'
                        >
                          <ItemIcon className='w-3 h-3 text-muted-foreground shrink-0' />
                          <span className='text-2xs flex-1 truncate'>
                            {item.name}
                          </span>
                          <span className='text-tiny text-muted-foreground font-mono'>
                            ${item.price}
                          </span>
                          <span className='text-tiny text-muted-foreground flex items-center gap-0.5'>
                            <Users className='w-2.5 h-2.5' />
                            {soldCount}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <span className='flex items-center gap-1'>
                <Users className='w-3 h-3' />
                {entryCount}
              </span>
              <span className='flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                {formatDate(new Date(event.createdAt))}
              </span>
            </div>
            <ArrowRight className='w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all' />
          </div>
        </div>
      </Link>
    </div>
  )
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash
}

function getEventIcon(name: string): IconType {
  const lowerName = name.toLowerCase()
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerName.includes(keyword)) return icon
  }
  return defaultIcons[
    Math.floor(Math.abs(hashCode(name)) % defaultIcons.length)
  ]
}
