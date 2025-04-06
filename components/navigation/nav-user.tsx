'use client'

import { ChevronsUpDown, CogIcon, Heart, KeyRound, LogOut } from 'lucide-react'

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

export function NavUser({ user }: { user: ContextUser | undefined | null }) {
  const { isMobile } = useSidebar()
  const { logout } = useAuth()
  const [vaultOpen, setVaultOpen] = useState(false)
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
              <DropdownMenuItem
                className='cursor-pointer'
                onClick={() => setVaultOpen(true)}
              >
                <KeyRound />
                Email Vault
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer'>
                <CogIcon />
                Change Password
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() => void logout()}
            >
              <LogOut />
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
