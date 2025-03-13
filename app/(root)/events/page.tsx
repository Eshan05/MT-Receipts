'use client'

import { Button } from '@/components/ui/button'
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
import { cn, formatDate } from '@/lib/utils'
import { IEvent } from '@/models/event.model'
import { defaultIcons, iconMap, typeIcons, typeStyles } from '@/utils/mappings'
import {
  ArrowRight,
  Calendar,
  Filter,
  Link2,
  LinkIcon,
  MoreVertical,
  Package,
  Pencil,
  PlusCircle,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import type { IconType } from 'react-icons'
import { toast } from 'sonner'
import { EventForm } from './_components/event-form'
import {
  EventFilters as EventFiltersComponent,
  type EventFilters,
} from './_components/event-filters'

interface ItemCounts {
  [eventId: string]: {
    [itemName: string]: number
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<IEvent[]>([])
  const [itemCounts, setItemCounts] = useState<ItemCounts>({})
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const includeDeleted = filters.includeDeleted
        const response = await fetch(
          `/api/events?includeDeleted=${includeDeleted}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        const data = await response.json()
        setEvents(data.events)

        const eventIds = data.events
          .map((e: IEvent) => e._id?.toString())
          .filter(Boolean)
        if (eventIds.length > 0) {
          const countsResponse = await fetch(
            `/api/events/items?eventIds=${eventIds.join(',')}`
          )
          if (countsResponse.ok) {
            const countsData = await countsResponse.json()
            setItemCounts(countsData.counts)
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        toast.error('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [filters.includeDeleted])

  const handleEventCreated = (newEvent: IEvent) => {
    setEvents((prevEvents) => [newEvent, ...prevEvents])
    setOpen(false)
    toast.success(`Event "${newEvent.name}" created successfully!`)
  }

  const handleEventUpdated = (updatedEvent: IEvent) => {
    setEvents((prevEvents) =>
      prevEvents.map((e) =>
        e._id?.toString() === updatedEvent._id?.toString() ? updatedEvent : e
      )
    )
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
    setDeleting(true)
    try {
      const response = await fetch(`/api/events/${deleteEvent.eventCode}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete event')
      }
      setDeleteEvent(null)
      setFilters((prev) => ({ ...prev, includeDeleted: prev.includeDeleted }))
      toast.success(`Event "${deleteEvent.name}" deleted`)
    } catch (error) {
      toast.error('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const handleRestoreEvent = async (e: React.MouseEvent, event: IEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const response = await fetch(`/api/events/${event.eventCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) {
        throw new Error('Failed to restore event')
      }
      setFilters((prev) => ({ ...prev, includeDeleted: prev.includeDeleted }))
      toast.success(`Event "${event.name}" restored`)
    } catch (error) {
      toast.error('Failed to restore event')
    }
  }

  const handleShareEvent = (e: React.MouseEvent, event: IEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/events/${event.eventCode}`
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

  return (
    <div className='container py-2'>
      <header className='mb-6'>
        <div className='flex justify-between items-center'>
          <h1 className='text-4xl my-2 font-semibold shadow-heading'>Events</h1>
          <div className='flex items-center gap-2'>
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
      {loading ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className='animate-pulse rounded-lg bg-muted/30 h-32'
            />
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {filteredEvents.map((event) => (
            <EventCard
              key={event._id?.toString()}
              event={event}
              itemCounts={itemCounts[event._id?.toString() || ''] || {}}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onShare={handleShareEvent}
              onRestore={handleRestoreEvent}
            />
          ))}
        </div>
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
    </div>
  )
}

function EventCard({
  event,
  itemCounts,
  onEdit,
  onDelete,
  onShare,
  onRestore,
}: {
  event: IEvent
  itemCounts: Record<string, number>
  onEdit: (e: React.MouseEvent, event: IEvent) => void
  onDelete: (e: React.MouseEvent, event: IEvent) => void
  onShare: (e: React.MouseEvent, event: IEvent) => void
  onRestore: (e: React.MouseEvent, event: IEvent) => void
}) {
  const style = typeStyles[event.type] || typeStyles.other
  const TypeIcon = typeIcons[event.type] || Package
  const EventIcon = getEventIcon(event.name)
  const isDeleted = !event.isActive

  return (
    <Link href={`/events/${event.eventCode}`} className='group block'>
      <div
        className={cn(
          'rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors',
          'border-l-2',
          style.border,
          isDeleted && 'opacity-60'
        )}
      >
        <div
          className={cn(
            'px-3 py-1.5 flex items-center justify-between',
            style.bg
          )}
        >
          <div className='flex items-center gap-1.5'>
            <TypeIcon className={cn('w-3.5 h-3.5', style.text)} />
            <span className={cn('text-xs font-medium capitalize', style.text)}>
              {event.type}
            </span>
            {isDeleted && (
              <span className='text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive'>
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
                <Calendar className='w-3 h-3' />
                {formatDate(new Date(event.createdAt))}
              </span>
            </div>
            <ArrowRight className='w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all' />
          </div>
        </div>
      </div>
    </Link>
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
