'use client'

import useSWR from 'swr'
import { Building2, Users, ShieldCheck, Clock3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

interface OrganizationsResponse {
  organizations: { status: string }[]
}

interface UsersResponse {
  users: { isSuperAdmin: boolean }[]
}

export default function SuperadminDashboardPage() {
  const { data: organizationsData } = useSWR<OrganizationsResponse>(
    '/api/admins/organizations?limit=100',
    fetcher
  )
  const { data: usersData } = useSWR<UsersResponse>(
    '/api/admins/users?limit=100',
    fetcher
  )

  const organizations = organizationsData?.organizations || []
  const users = usersData?.users || []

  const activeOrganizations = organizations.filter(
    (o) => o.status === 'active'
  ).length
  const pendingOrganizations = organizations.filter(
    (o) => o.status === 'pending'
  ).length
  const suspendedOrganizations = organizations.filter(
    (o) => o.status === 'suspended'
  ).length

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl shadow-heading font-bold'>
            Superadmin Dashboard
          </h1>
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          System-wide overview of organizations, users, and platform status.
        </p>
      </header>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Building2 className='h-4 w-4 text-muted-foreground' />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{organizations.length}</p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Users className='h-4 w-4 text-muted-foreground' />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{users.length}</p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <ShieldCheck className='h-4 w-4 text-muted-foreground' />
              Active Orgs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{activeOrganizations}</p>
            <p className='text-xs text-muted-foreground'>
              Pending: {pendingOrganizations} • Suspended:{' '}
              {suspendedOrganizations}
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Clock3 className='h-4 w-4 text-muted-foreground' />
              Superadmins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>
              {users.filter((u) => u.isSuperAdmin).length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
