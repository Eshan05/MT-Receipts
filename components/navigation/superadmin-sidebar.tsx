'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ShieldCheck, Building2, Users } from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/components/navigation/nav-main'
import { NavUser } from '@/components/navigation/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

export default function SuperadminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const navItems = React.useMemo(
    () => [
      {
        title: 'Dashboard',
        url: '/s/dashboard',
        icon: ShieldCheck,
      },
      {
        title: 'Organizations',
        url: '/s/organizations',
        icon: Building2,
      },
      {
        title: 'Users',
        url: '/s/users',
        icon: Users,
      },
    ],
    []
  )

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <div className='flex items-center gap-2 px-2 py-1'>
          <div className='h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center'>
            <ShieldCheck className='h-4 w-4' />
          </div>
          <div className='flex flex-col min-w-0'>
            <span className='text-sm font-semibold truncate'>Superadmin</span>
            <span className='text-xs text-muted-foreground truncate'>
              Platform Control
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} mode='superadmin' />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function SuperadminSidebarSkeleton() {
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <Skeleton className='h-12 w-full' />
      </SidebarHeader>
      <SidebarContent>
        <Skeleton className='h-12 w-full' />
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
