'use client'

import { useAuth } from '@/contexts/AuthContext'
import { CalendarDaysIcon, ChartArea, Newspaper, UsersIcon } from 'lucide-react'
import * as React from 'react'
import useSWR from 'swr'

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
import { ReceiptActivityCredenza } from '@/components/navigation/receipt-activity-credenza'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

export default function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, currentOrganization } = useAuth()
  const [receiptLogOpen, setReceiptLogOpen] = React.useState(false)

  const orgSlug = currentOrganization?.slug

  const { data: recentEventsData } = useSWR<{
    events: { name: string; eventCode: string }[]
  }>(orgSlug ? '/api/events?limit=5' : null, fetcher)

  const recentEvents = React.useMemo(
    () =>
      (recentEventsData?.events || []).map((event) => ({
        name: event.name,
        url: `/${orgSlug}/events/${event.eventCode}`,
        eventCode: event.eventCode,
      })),
    [recentEventsData, orgSlug]
  )

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
        title: 'Members',
        url: `/${orgSlug}/members`,
        icon: UsersIcon,
      },
      {
        title: 'Make Receipts',
        url: `/${orgSlug}/receipts`,
        icon: Newspaper,
      },
    ]
  }, [orgSlug])

  return (
    <>
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
          <NavUser user={user} onViewReceipts={() => setReceiptLogOpen(true)} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <ReceiptActivityCredenza
        open={receiptLogOpen}
        onOpenChange={setReceiptLogOpen}
      />
    </>
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
