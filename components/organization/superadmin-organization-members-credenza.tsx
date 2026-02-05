'use client'

import useSWR from 'swr'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import {
  createColumns,
  DataTable,
  memberSchema,
  type Member,
} from '@/components/table/members'
import { useMemo } from 'react'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

interface MembersResponse {
  members: Member[]
}

interface SuperadminOrganizationMembersCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  orgName: string
}

export function SuperadminOrganizationMembersCredenza({
  open,
  onOpenChange,
  slug,
  orgName,
}: SuperadminOrganizationMembersCredenzaProps) {
  const { data, mutate } = useSWR<MembersResponse>(
    open ? `/api/admins/organizations/${slug}/members` : null,
    fetcher
  )

  const members = useMemo(
    () =>
      (data?.members || []).filter(
        (member) => memberSchema.safeParse(member).success
      ),
    [data?.members]
  )

  const columns = useMemo(
    () =>
      createColumns({
        isAdmin: true,
        mode: 'superadmin',
        organizationSlug: slug,
        onUpdate: () => mutate(),
      }),
    [mutate, slug]
  )

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-5xl'>
        <CredenzaHeader>
          <CredenzaTitle>Organization Members</CredenzaTitle>
          <CredenzaDescription>
            Viewing member list for {orgName} ({slug}) in superadmin mode.
          </CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody>
          <DataTable
            columns={columns}
            data={members}
            isAdmin
            mode='superadmin'
            organizationSlug={slug}
            onUpdate={() => mutate()}
          />
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  )
}
