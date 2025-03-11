'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen,
  ChartArea,
  Frame,
  Newspaper,
  PieChart,
  User2Icon,
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
      title: 'View Students',
      url: '/admin/students',
      icon: User2Icon,
    },
    {
      title: 'View Events',
      url: '/admin/events',
      icon: BookOpen,
    },
    {
      title: 'View Graphs',
      url: '/admin',
      icon: ChartArea,
    },
    {
      title: 'Create Events',
      url: '/admin/create',
      icon: Newspaper,
    },
  ],
  projects: [
    {
      name: 'Web Map',
      url: '#',
      icon: Frame,
    },
    {
      name: 'Statistics',
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
