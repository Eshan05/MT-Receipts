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
} from '@/components/ui/credenza'
import { cn, formatDate } from '@/lib/utils'
import { IEvent } from '@/models/event.model'
import { defaultIcons, iconMap, typeIcons, typeStyles } from '@/utils/mappings'
import { ArrowLeft, Calendar, Package, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { toast } from 'sonner'

export default function TrashPage() {
  const [events, setEvents] = useState<IEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [restoreEvent, setRestoreEvent] = useState<IEvent | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events?deleted=true')
        if (!response.ok) {
          throw new Error('Failed to fetch deleted events')
        }
        const data = await response.json()
        setEvents(data.events)
      } catch (error) {
        console.error('Error fetching deleted events:', error)
        toast.error('Failed to load deleted events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleRestoreEvent = async () => {
    if (!restoreEvent) return
    setRestoring(true)
    try {
      const response = await fetch(`/api/events/${restoreEvent.eventCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) {
        throw new Error('Failed to restore event')
      }
      setEvents((prevEvents) =>
        prevEvents.filter(
          (e) => e._id?.toString() !== restoreEvent._id?.toString()
        )
      )
      setRestoreEvent(null)
      toast.success(`Event "${restoreEvent.name}" restored`)
    } catch (error) {
      toast.error('Failed to restore event')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className='container py-8'>
      <div className='flex justify-between items-center mb-6'>
        <div className='flex items-center gap-2'>
          <Link href='/events'>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <ArrowLeft className='w-4 h-4' />
            </Button>
          </Link>
          <h1 className='text-2xl font-semibold'>Trash</h1>
        </div>
      </div>

      {loading ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className='animate-pulse rounded-lg bg-muted/30 h-24'
            />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {events.map((event) => (
            <DeletedEventCard
              key={event._id?.toString()}
              event={event}
              onRestore={(e) => {
                e.preventDefault()
                setRestoreEvent(event)
              }}
            />
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <Trash2 className='w-12 h-12 mx-auto text-muted-foreground/30 mb-4' />
          <p className='text-muted-foreground'>Trash is empty</p>
        </div>
      )}

      <Credenza
        open={!!restoreEvent}
        onOpenChange={(open) => !open && setRestoreEvent(null)}
      >
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Restore Event</CredenzaTitle>
            <CredenzaDescription>
              Are you sure you want to restore "{restoreEvent?.name}"? It will
              be moved back to the events list.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaFooter>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setRestoreEvent(null)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button size='sm' onClick={handleRestoreEvent} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Restore'}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}

function DeletedEventCard({
  event,
  onRestore,
}: {
  event: IEvent
  onRestore: (e: React.MouseEvent) => void
}) {
  const style = typeStyles[event.type] || typeStyles.other
  const TypeIcon = typeIcons[event.type] || Package
  const EventIcon = getEventIcon(event.name)

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden bg-muted/20 border border-dashed border-muted-foreground/20',
        'border-l-2',
        style.border
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
        </div>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            size='none'
            variant='unstyled'
            onClick={onRestore}
            className='p-0.5 hover:bg-background/50 rounded'
          >
            <RotateCcw className='w-3.5 h-3.5 text-muted-foreground' />
          </Button>
          <span className='text-tiny text-muted-foreground font-mono'>
            {event.eventCode}
          </span>
        </div>
      </div>

      <div className='p-3'>
        <div className='flex items-start gap-2.5'>
          <div className='mt-0.5 p-1.5 rounded-md bg-background/50'>
            <EventIcon className='w-4 h-4 text-muted-foreground/50' />
          </div>
          <div className='flex-1 min-w-0'>
            <h3 className='font-medium text-sm truncate text-muted-foreground'>
              {event.name}
            </h3>
            <p className='text-xs text-muted-foreground/70 line-clamp-1 mt-0.5'>
              {event.desc || 'No description'}
            </p>
          </div>
        </div>

        <div className='flex items-center justify-between mt-3 pt-2 border-t border-border/20'>
          <div className='flex items-center gap-3 text-2xs text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Package className='w-3 h-3' />
              {event.items.length} items
            </span>
            <span className='flex items-center gap-1'>
              <Calendar className='w-3 h-3' />
              {formatDate(new Date(event.createdAt))}
            </span>
          </div>
        </div>
      </div>
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
