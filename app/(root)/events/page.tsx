'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Credenza,
  CredenzaTrigger,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
} from '@/components/ui/credenza'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  PlusCircle,
  Calendar,
  Package,
  Hash,
  ArrowRight,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { EventForm } from './_components/event-form'
import { IEvent } from '@/models/event.model'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import React from 'react'
import {
  FaTshirt,
  FaHatCowboy,
  FaUtensils,
  FaCoffee,
  FaCode,
  FaLaptop,
  FaTrophy,
  FaGamepad,
  FaMusic,
  FaPaintBrush,
  FaBook,
  FaTicketAlt,
  FaPlane,
  FaCamera,
  FaPencilAlt,
  FaGift,
  FaMedal,
  FaIdBadge,
  FaStickyNote,
  FaPen,
  FaShoppingBag,
  FaDollarSign,
} from 'react-icons/fa'
import { BiWater } from 'react-icons/bi'
import { RiLuggageCartLine } from 'react-icons/ri'
import {
  MdCake,
  MdCelebration,
  MdCardMembership,
  MdMovie,
  MdSportsSoccer,
  MdWorkspacePremium,
} from 'react-icons/md'
import { IoGameController } from 'react-icons/io5'
import { BsTools, BsLightningCharge, BsBookmark } from 'react-icons/bs'
import { HiAcademicCap } from 'react-icons/hi'
import type { IconType } from 'react-icons'

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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events')
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
  }, [])

  const handleEventCreated = (newEvent: IEvent) => {
    setEvents((prevEvents) => [newEvent, ...prevEvents])
    setOpen(false)
    toast.success(`Event "${newEvent.name}" created successfully!`)
  }

  return (
    <div className='container py-8'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-semibold'>Events</h1>
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

      {loading ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className='animate-pulse rounded-lg bg-muted/30 h-32'
            />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className='grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {events.map((event) => (
            <EventCard
              key={event._id?.toString()}
              event={event}
              itemCounts={itemCounts[event._id?.toString() || ''] || {}}
            />
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <p className='text-muted-foreground mb-4'>No events yet</p>
          <Button size='sm' onClick={() => setOpen(true)}>
            Create one
          </Button>
        </div>
      )}
    </div>
  )
}

const typeStyles: Record<string, { bg: string; text: string; border: string }> =
  {
    seminar: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/30',
    },
    workshop: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      border: 'border-amber-500/30',
    },
    conference: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-600',
      border: 'border-indigo-500/30',
    },
    competition: {
      bg: 'bg-red-500/10',
      text: 'text-red-600',
      border: 'border-red-500/30',
    },
    meetup: {
      bg: 'bg-teal-500/10',
      text: 'text-teal-600',
      border: 'border-teal-500/30',
    },
    training: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-600',
      border: 'border-cyan-500/30',
    },
    webinar: {
      bg: 'bg-sky-500/10',
      text: 'text-sky-600',
      border: 'border-sky-500/30',
    },
    hackathon: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-600',
      border: 'border-orange-500/30',
    },
    concert: {
      bg: 'bg-pink-500/10',
      text: 'text-pink-600',
      border: 'border-pink-500/30',
    },
    fundraiser: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'border-emerald-500/30',
    },
    networking: {
      bg: 'bg-violet-500/10',
      text: 'text-violet-600',
      border: 'border-violet-500/30',
    },
    internal: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-600',
      border: 'border-slate-500/30',
    },
    other: {
      bg: 'bg-gray-500/10',
      text: 'text-gray-600',
      border: 'border-gray-500/30',
    },
  }

const typeIcons: Record<string, IconType> = {
  seminar: HiAcademicCap,
  workshop: BsTools,
  conference: FaLaptop,
  competition: FaTrophy,
  meetup: FaIdBadge,
  training: FaBook,
  webinar: FaLaptop,
  hackathon: BsLightningCharge,
  concert: FaMusic,
  fundraiser: FaGift,
  networking: FaIdBadge,
  internal: FaIdBadge,
  other: Package,
}

function EventCard({
  event,
  itemCounts,
}: {
  event: IEvent
  itemCounts: Record<string, number>
}) {
  const style = typeStyles[event.type] || typeStyles.other
  const TypeIcon = typeIcons[event.type] || Package
  const EventIcon = getEventIcon(event.name)

  return (
    <Link href={`/events/${event.eventCode}`} className='group block'>
      <div
        className={cn(
          'rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors',
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
          <span className='text-[10px] text-muted-foreground font-mono'>
            {event.eventCode}
          </span>
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
            <div className='flex items-center gap-3 text-2xs text-muted-foreground'>
              <span onPointerDownCapture={(e) => e.stopPropagation()}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type='button'
                      onPointerDownCapture={(e) => e.stopPropagation()}
                      size={'none'}
                      variant={'unstyled'}
                      className='flex items-center gap-1 hover:text-foreground transition-colors'
                    >
                      <Package className='w-3 h-3' />
                      {event.items.length}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align='start' className='w-56 p-1.5'>
                    <div className='px-2 py-1.5 border-b border-border/50 mb-1'>
                      <p className='text-xs font-medium'>Items</p>
                    </div>
                    <div className='space-y-0.5'>
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
              </span>
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

const iconMap: Record<string, IconType> = {
  shirt: FaTshirt,
  tshirt: FaTshirt,
  't-shirt': FaTshirt,
  hat: FaHatCowboy,
  cap: FaHatCowboy,
  food: FaUtensils,
  meal: FaUtensils,
  lunch: FaUtensils,
  dinner: FaUtensils,
  breakfast: FaUtensils,
  coffee: FaCoffee,
  tea: FaCoffee,
  workshop: BsTools,
  seminar: HiAcademicCap,
  code: FaCode,
  coding: FaCode,
  programming: FaCode,
  computer: FaLaptop,
  tech: FaLaptop,
  technology: FaLaptop,
  sport: FaTrophy,
  sports: MdSportsSoccer,
  game: IoGameController,
  gaming: IoGameController,
  music: FaMusic,
  art: FaPaintBrush,
  dance: FaMusic,
  book: FaBook,
  books: FaBook,
  ticket: FaTicketAlt,
  pass: FaTicketAlt,
  party: MdCelebration,
  celebration: MdCelebration,
  birthday: MdCake,
  certificate: MdCardMembership,
  registration: FaIdBadge,
  travel: FaPlane,
  trip: FaPlane,
  photo: FaCamera,
  photography: FaCamera,
  video: FaCamera,
  movie: MdMovie,
  design: FaPencilAlt,
  hackathon: BsLightningCharge,
  admission: FaTicketAlt,
  entry: FaTicketAlt,
  badge: FaIdBadge,
  id: FaIdBadge,
  lanyard: FaIdBadge,
  sticker: BsBookmark,
  poster: FaCamera,
  banner: FaCamera,
  kit: RiLuggageCartLine,
  goodies: FaGift,
  swag: RiLuggageCartLine,
  bag: FaShoppingBag,
  bottle: BiWater,
  mug: FaCoffee,
  pen: FaPen,
  notebook: FaStickyNote,
  notepad: FaStickyNote,
  water: BiWater,
  drink: BiWater,
  snack: FaUtensils,
  merchandise: FaTshirt,
  merch: FaTshirt,
}

const defaultIcons: IconType[] = [
  FaTrophy,
  FaGift,
  FaTicketAlt,
  FaLaptop,
  FaBook,
  FaMedal,
  FaCode,
  RiLuggageCartLine,
  MdWorkspacePremium,
  BsLightningCharge,
]

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
