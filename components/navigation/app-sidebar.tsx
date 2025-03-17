'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarDaysIcon,
  ChartArea,
  FileTextIcon,
  Newspaper,
} from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/components/navigation/nav-main'
import { NavProjects } from '@/components/navigation/nav-projects'
import { NavUser } from '@/components/navigation/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

const data = {
  navMain: [
    {
      title: 'View Events',
      url: '/events',
      icon: CalendarDaysIcon,
    },
    {
      title: 'Admin Dashboard',
      url: '/dashboard',
      icon: ChartArea,
    },
    {
      title: 'View Receipts',
      url: '/templates',
      icon: FileTextIcon,
    },
    {
      title: 'Make Receipts',
      url: '/receipts',
      icon: Newspaper,
    },
  ],
}

export default function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const [recentEvents, setRecentEvents] = React.useState<
    { name: string; url: string; eventCode: string }[]
  >([])

  React.useEffect(() => {
    async function fetchRecentEvents() {
      try {
        const res = await fetch('/api/events?limit=5')
        const data = await res.json()
        if (data.events) {
          setRecentEvents(
            data.events.map((event: { name: string; eventCode: string }) => ({
              name: event.name,
              url: `/events/${event.eventCode}`,
              eventCode: event.eventCode,
            }))
          )
        }
      } catch (e) {
        console.error('Failed to fetch recent events:', e)
      }
    }
    fetchRecentEvents()
  }, [])

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={recentEvents} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible='icon'>
      <SidebarContent>
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
      </SidebarContent>
      <SidebarFooter>
        <Skeleton className='h-12 w-full' />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
