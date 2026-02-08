'use client'

import {
  Building2Icon,
  ChevronsUpDown,
  CheckIcon,
  PlusIcon,
  Users2Icon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavOrganization() {
  const { isMobile } = useSidebar()
  const { currentOrganization, memberships, switchOrganization } = useAuth()
  const pathname = usePathname()

  if (!currentOrganization) {
    return null
  }

  const handleSwitch = async (slug: string) => {
    if (slug !== currentOrganization.slug) {
      await switchOrganization(slug)
    }
  }

  const getOrgAvatar = (name: string) => {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`
  }

  const currentMembership = memberships.find(
    (m) => m.organizationSlug === currentOrganization.slug
  )

  const logoSrc =
    currentOrganization.logoUrl ||
    currentMembership?.organizationLogoUrl ||
    (currentOrganization.name ? getOrgAvatar(currentOrganization.name) : '')

  const memberCount =
    currentOrganization.memberCount ??
    currentMembership?.organizationMemberCount

  const description =
    currentOrganization.description ||
    currentMembership?.organizationDescription

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={logoSrc} alt={currentOrganization.name} />
                <AvatarFallback className='rounded-lg'>
                  <Building2Icon className='h-4 w-4' />
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {currentOrganization.name}
                </span>
                <span className='truncate text-xs text-muted-foreground'>
                  {currentOrganization.role === 'admin'
                    ? 'Administrator'
                    : 'Member'}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='start'
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Organizations
            </DropdownMenuLabel>
            {memberships.map((membership) => (
              <DropdownMenuItem
                key={membership.organizationId}
                onClick={() => void handleSwitch(membership.organizationSlug)}
                className='cursor-pointer gap-2 p-2'
              >
                <Avatar className='h-6 w-6 rounded-md'>
                  <AvatarImage
                    src={
                      membership.organizationLogoUrl ||
                      getOrgAvatar(membership.organizationName)
                    }
                    alt={membership.organizationName}
                  />
                  <AvatarFallback className='rounded-md text-xs'>
                    {membership.organizationName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight min-w-0'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <span className='truncate font-medium'>
                      {membership.organizationName}
                    </span>
                    <Badge
                      variant='outline'
                      className='shrink-0 text-tiny h-4 py-1'
                    >
                      <Users2Icon />
                      {typeof membership.organizationMemberCount === 'number'
                        ? membership.organizationMemberCount
                        : '—'}
                    </Badge>
                  </div>
                  {membership.organizationDescription ? (
                    <span className='truncate text-2xs text-muted-foreground'>
                      {membership.organizationDescription}
                    </span>
                  ) : null}
                  <span className='truncate text-xs text-muted-foreground'>
                    {membership.role === 'admin' ? 'Administrator' : 'Member'}
                  </span>
                </div>
                {membership.organizationSlug === currentOrganization.slug && (
                  <CheckIcon className='h-4 w-4 text-primary' />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href='/o' className='cursor-pointer gap-2'>
                <PlusIcon className='h-4 w-4' />
                <span>Create or Join Organization</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
