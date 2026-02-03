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
import { NavOrganization } from '@/components/navigation/nav-organization'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, currentOrganization } = useAuth()
  const [recentEvents, setRecentEvents] = React.useState<
    { name: string; url: string; eventCode: string }[]
  >([])

  const orgSlug = currentOrganization?.slug

  const navItems = React.useMemo(() => {
    if (!orgSlug) {
      return []
    }
    return [
      {
        title: 'View Events',
        url: `/${orgSlug}/events`,
        icon: CalendarDaysIcon,
      },
      {
        title: 'Admin Dashboard',
        url: `/${orgSlug}/dashboard`,
        icon: ChartArea,
      },
      {
        title: 'View Receipts',
        url: `/${orgSlug}/templates`,
        icon: FileTextIcon,
      },
      {
        title: 'Make Receipts',
        url: `/${orgSlug}/receipts`,
        icon: Newspaper,
      },
    ]
  }, [orgSlug])

  React.useEffect(() => {
    async function fetchRecentEvents() {
      if (!orgSlug) return
      try {
        const res = await fetch(`/api/events?limit=5`)
        const data = await res.json()
        if (data.events) {
          setRecentEvents(
            data.events.map((event: { name: string; eventCode: string }) => ({
              name: event.name,
              url: `/${orgSlug}/events/${event.eventCode}`,
              eventCode: event.eventCode,
            }))
          )
        }
      } catch (e) {
        console.error('Failed to fetch recent events:', e)
      }
    }
    fetchRecentEvents()
  }, [orgSlug])

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <NavOrganization />
      </SidebarHeader>
      <SidebarContent>
        {orgSlug && (
          <>
            <NavMain items={navItems} />
            <NavProjects projects={recentEvents} />
          </>
        )}
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
      <SidebarHeader>
        <Skeleton className='h-12 w-full' />
      </SidebarHeader>
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
