'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarDaysIcon,
  ChartArea,
  FileTextIcon,
  Frame,
  Newspaper,
  PieChart,
  PlusCircleIcon,
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
      title: 'Create Events',
      url: '/events/create',
      icon: PlusCircleIcon,
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
  projects: [
    {
      name: 'ACES Merchandise',
      url: '#',
      icon: Frame,
    },
    {
      name: 'BE Farewell',
      url: '#',
      icon: PieChart,
    },
  ],
}

export default function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, isAuthenticated } = useAuth()
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
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
