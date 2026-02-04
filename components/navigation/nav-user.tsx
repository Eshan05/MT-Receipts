'use client'

import {
  ChevronsUpDown,
  FileTextIcon,
  Heart,
  KeyRound,
  LogOut,
  UsersIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { ContextUser, useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState } from 'react'
import { EmailVaultCredenza } from '@/components/navigation/email-vault-credenza'
import { OrganizationSettingsDropdown } from '@/components/organization/organization-settings-dropdown'

interface NavUserProps {
  user: ContextUser | undefined | null
  onViewReceipts?: () => void
}

export function NavUser({ user, onViewReceipts }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { logout, currentOrganization } = useAuth()
  const [vaultOpen, setVaultOpen] = useState(false)
  const isAdmin = currentOrganization?.role === 'admin'

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
                <AvatarImage src={''} alt={user?.username || ''} />
                <AvatarFallback className='rounded-lg'>
                  {user?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {user?.username || 'Unknown'}
                </span>
                <span className='truncate text-xs'>
                  {user?.email || 'No Mail'}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={''} alt={user?.username || 'Unknown'} />
                  <AvatarFallback className='rounded-lg'>
                    {user?.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {user?.username || 'Unknown'}
                  </span>
                  <span className='truncate text-xs'>
                    {user?.email || 'No Mail'}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {currentOrganization && (
                <>
                  <OrganizationSettingsDropdown />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${currentOrganization.slug}/members`}
                      className='cursor-pointer'
                    >
                      <UsersIcon className='h-4 w-4' />
                      Members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={() => onViewReceipts?.()}
                  >
                    <FileTextIcon className='h-4 w-4' />
                    View Receipts
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={() => setVaultOpen(true)}
                  >
                    <KeyRound className='h-4 w-4' />
                    Email Vault
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() => void logout()}
            >
              <LogOut className='h-4 w-4' />
              Log out
            </DropdownMenuItem>
            <div className='flex items-center justify-center gap-2 p-2 text-xs text-muted-foreground'>
              <Heart className='w-4 h-4 text-red-400/50 animate-pulse' />
              <span className='text-muted-foreground'>
                Made by{' '}
                <Link
                  href='https://github.com/ACES-RMDSSOE'
                  className='hover:underline'
                >
                  ACES
                </Link>
              </span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <EmailVaultCredenza open={vaultOpen} onOpenChange={setVaultOpen} />
    </SidebarMenu>
  )
}
