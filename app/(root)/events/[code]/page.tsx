'use client'

import {
  DataTable,
  columns,
  type EventEntry,
} from '@/components/table/event-entries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Skeleton } from '@/components/ui/skeleton'
import { typeIcons, typeStyles } from '@/utils/mappings'
import { IEvent } from '@/models/event.model'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Users,
  PlusCircle,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/utils'
import { EntryForm } from './_components/entry-form'
import { EventForm } from '../_components/event-form'
import { toast } from 'sonner'

export default function EventEntriesPage() {
  const params = useParams()
  const code = params.code as string

  const [event, setEvent] = useState<IEvent | null>(null)
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entryFormOpen, setEntryFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${code}/entries`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err)
    }
  }, [code])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [eventRes, entriesRes] = await Promise.all([
          fetch(`/api/events/${code}`),
          fetch(`/api/events/${code}/entries`),
        ])

        if (!eventRes.ok) {
          throw new Error('Failed to fetch event')
        }

        const eventData = await eventRes.json()
        setEvent(eventData.event)

        if (entriesRes.ok) {
          const entriesData = await entriesRes.json()
          setEntries(entriesData.entries || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      fetchData()
    }
  }, [code])

  const handleEntryCreated = async () => {
    setEntryFormOpen(false)
    await fetchEntries()
  }

  const handleEventUpdated = async (updatedEvent: IEvent) => {
    setEditFormOpen(false)
    setEvent(updatedEvent)
    toast.success(`Event "${updatedEvent.name}" updated successfully!`)
  }

  if (loading) {
    return (
      <div className='container py-2 pb-24'>
        <header className='mb-6'>
          <div className='flex items-center gap-3 my-2'>
            <Skeleton className='h-8 w-8 rounded' />
            <div className='space-y-2'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-24' />
            </div>
          </div>
        </header>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className='h-24 rounded-lg' />
          ))}
        </div>
        <Skeleton className='h-96 w-full rounded-lg' />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className='container py-2 pb-24'>
        <div className='text-center py-12'>
          <p className='text-muted-foreground mb-4'>
            {error || 'Event not found'}
          </p>
          <Button asChild>
            <Link href='/events'>
              <ArrowLeft className='w-4 h-4 mr-2' />
              Back to Events
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const TypeIcon = typeIcons[event.type] || Package
  const style = typeStyles[event.type] || typeStyles.other

  return (
    <div className='container py-2 pb-24'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='icon' asChild>
              <Link href='/events'>
                <ArrowLeft className='w-4 h-4' />
              </Link>
            </Button>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Badge
                variant='outline'
                className={cn('capitalize text-xs', style.text, style.bg)}
              >
                {event.type}
              </Badge>
              <span className='font-mono text-xs'>{event.eventCode}</span>
            </div>
          </div>
          <div className='flex items-center gap-1 flex-wrap'>
            <Button
              size='sm'
              variant={'secondary'}
              className='gap-1.5'
              onClick={() => setEditFormOpen(true)}
            >
              <Pencil className='w-4 h-4' />
              Edit
            </Button>
            <Button
              size='sm'
              className='gap-1.5'
              onClick={() => setEntryFormOpen(true)}
            >
              <PlusCircle className='w-4 h-4' />
              Entry
            </Button>
          </div>
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <div className={cn('p-1.5 rounded-lg', style.bg)}>
              <TypeIcon className={cn('w-4 h-4', style.text)} />
            </div>
            <h1 className='text-2xl font-semibold shadow-heading'>
              {event.name}
            </h1>
          </div>
        </div>
        {event.desc && (
          <p className='text-muted-foreground text-sm max-w-md'>{event.desc}</p>
        )}
      </header>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <Card className=''>
          <CardHeader className=''>
            <CardDescription className='flex items-center gap-1.5'>
              <Package className='w-3.5 h-3.5' />
              Items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{event.items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className=''>
            <CardDescription className='flex items-center gap-1.5'>
              <Users className='w-3.5 h-3.5' />
              Entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className=''>
            <CardDescription className='flex items-center gap-1.5'>
              <Calendar className='w-3.5 h-3.5' />
              Date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm font-medium'>
              {event.startDate
                ? format(new Date(event.startDate), 'MMM d, yyyy')
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className=''>
            <CardDescription className='flex items-center gap-1.5'>
              <MapPin className='w-3.5 h-3.5' />
              Location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm font-medium truncate'>
              {event.location || 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className='border-0 ring-0 shadow-none'>
        <CardHeader>
          <CardTitle className='text-lg'>Event Entries</CardTitle>
          <CardDescription>
            View all purchases and receipts for this event
          </CardDescription>
        </CardHeader>
        <CardContent className=''>
          <DataTable columns={columns} data={entries} />
        </CardContent>
      </Card>

      <Credenza open={entryFormOpen} onOpenChange={setEntryFormOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Add Entry</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody>
            {event && (
              <EntryForm
                event={event}
                onSuccess={handleEntryCreated}
                onCancel={() => setEntryFormOpen(false)}
              />
            )}
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>

      <Credenza open={editFormOpen} onOpenChange={setEditFormOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Edit Event</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody>
            {event && (
              <EventForm
                event={event}
                onSuccess={handleEventUpdated}
                onCancel={() => setEditFormOpen(false)}
              />
            )}
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}
