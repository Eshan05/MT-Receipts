'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import {
  createColumns,
  DataTable,
  userSchema,
  type UserRow,
} from '@/components/table/users'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

interface UsersResponse {
  users: UserRow[]
}

export default function SuperadminUsersPage() {
  const { data, mutate } = useSWR<UsersResponse>(
    '/api/admins/users?limit=100',
    fetcher
  )

  const users = useMemo(
    () =>
      (data?.users || []).filter((item) => userSchema.safeParse(item).success),
    [data?.users]
  )

  const columns = useMemo(() => createColumns(), [])

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl shadow-heading font-bold'>Users</h1>
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          View all platform users and their organization memberships.
        </p>
      </header>

      <DataTable columns={columns} data={users} onRefresh={mutate} />
    </div>
  )
}
