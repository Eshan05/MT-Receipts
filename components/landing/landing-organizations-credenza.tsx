'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2Icon,
  CalendarIcon,
  KeyRound,
  Loader2Icon,
  LogOutIcon,
  UsersIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from '@/components/ui/credenza'
import { AuthProvider, useAuth, type Membership } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { JoinWithCodeCredenza } from '@/components/organization/join-with-code-credenza'

interface SessionPayload {
  authenticated?: boolean
  memberships?: Membership[]
}

function LandingOrganizationsCredenzaInner() {
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [memberships, setMemberships] = useState<Membership[]>([])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function fetchOrganizations() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/sessions?detailed=true', {
          cache: 'no-store',
        })
        if (cancelled) return

        if (!res.ok) {
          setIsAuthenticated(false)
          setMemberships([])
          if (res.status !== 401) {
            setError('Failed to load your organizations.')
          }
          return
        }

        const data = (await res.json()) as SessionPayload

        setIsAuthenticated(!!data.authenticated)
        setMemberships(Array.isArray(data.memberships) ? data.memberships : [])
      } catch {
        if (cancelled) return
        setIsAuthenticated(false)
        setMemberships([])
        setError('Failed to load your organizations.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchOrganizations()

    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <>
      <JoinWithCodeCredenza open={joinOpen} onOpenChange={setJoinOpen} />

      <Credenza open={open} onOpenChange={setOpen}>
        <CredenzaTrigger asChild>
          <Button variant='outline' className='w-full sm:w-auto gap-2'>
            <Building2Icon className='h-4 w-4' />
            My Organizations
          </Button>
        </CredenzaTrigger>

        <CredenzaContent className='sm:max-w-lg'>
          <CredenzaHeader>
            <CredenzaTitle>My Organizations</CredenzaTitle>
            <CredenzaDescription>
              View your organizations and jump to events.
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaBody className='space-y-3'>
            {loading && (
              <div className='flex items-center justify-center py-2 gap-2 text-sm text-muted-foreground'>
                <Loader2Icon className='h-4 w-4 animate-spin' />
                Loading organizations...
              </div>
            )}

            {!loading && !isAuthenticated && (
              <div className='space-y-3'>
                <p className='text-sm text-muted-foreground'>
                  You need to sign in to view your organizations.
                </p>
                <div className='flex flex-col sm:flex-row gap-2'>
                  <Link href='/v' className='w-full sm:w-auto'>
                    <Button className='w-full'>Sign In</Button>
                  </Link>
                  <Link href='/o' className='w-full sm:w-auto'>
                    <Button variant='outline' className='w-full'>
                      Sign Up / Create Organization
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {!loading && isAuthenticated && memberships.length === 0 && (
              <p className='text-sm text-muted-foreground'>
                You are signed in, but not part of any organization yet.
              </p>
            )}

            {!loading && isAuthenticated && memberships.length > 0 && (
              <div className='space-y-3'>
                {memberships.map((membership) => {
                  const logo =
                    membership.organizationLogoUrl ||
                    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(membership.organizationSlug)}`

                  return (
                    <Link
                      key={`${membership.organizationId}:${membership.organizationSlug}`}
                      href={`/${membership.organizationSlug}/events`}
                      className='block rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors border-l-2 border-border group'
                      onClick={() => setOpen(false)}
                    >
                      <div className='px-3 py-1 flex items-center justify-between bg-muted/60'>
                        <div className='flex items-center gap-1.5'>
                          <Building2Icon className='h-3 w-3 text-muted-foreground' />
                          <span className='text-xs font-medium uppercase'>
                            {membership.role}
                          </span>
                        </div>
                        <Badge variant='secondary' className='capitalize h-5'>
                          {membership.organizationStatus || 'active'}
                        </Badge>
                      </div>

                      <div className='p-2'>
                        <div className='flex items-center gap-2'>
                          <div className='p-1 rounded-md bg-background'>
                            <img
                              src={logo}
                              alt={membership.organizationName}
                              className='size-4 rounded shrink-0'
                            />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <h3 className='font-medium text-sm truncate'>
                              {membership.organizationName}
                            </h3>
                            <p className='text-xs text-muted-foreground line-clamp-1 -mt-1'>
                              {membership.organizationDescription ||
                                'No description'}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center justify-between mt-1 pt-1 border-t border-border/30'>
                          <div className='flex items-center gap-3 text-2xs text-muted-foreground'>
                            <span className='flex items-center gap-1'>
                              <UsersIcon className='h-3 w-3' />
                              {membership.organizationExpectedMembers
                                ? membership.organizationExpectedMembers
                                : '-'}
                            </span>
                            <span className='flex items-center gap-1'>
                              <CalendarIcon className='h-3 w-3' />
                              {membership.organizationCreatedAt
                                ? new Date(
                                  membership.organizationCreatedAt
                                ).toLocaleDateString()
                                : '-'}
                            </span>
                          </div>

                          <div className='flex items-center gap-1'>
                            <ArrowRight className='w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all' />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {error && <p className='text-sm text-destructive'>{error}</p>}
          </CredenzaBody>

          {isAuthenticated && (
            <CredenzaFooter className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <Button
                variant='outline'
                className='w-full gap-2'
                onClick={() => {
                  setOpen(false)
                  setJoinOpen(true)
                }}
              >
                <KeyRound className='h-4 w-4' />
                Join with Code
              </Button>
              <Button
                variant='destructive'
                className='w-full gap-2'
                onClick={() => void logout()}
              >
                <LogOutIcon className='h-4 w-4' />
                Logout
              </Button>
            </CredenzaFooter>
          )}
        </CredenzaContent>
      </Credenza>
    </>
  )
}

export function LandingOrganizationsCredenza() {
  return (
    <AuthProvider autoRefresh={false}>
      <LandingOrganizationsCredenzaInner />
    </AuthProvider>
  )
}
