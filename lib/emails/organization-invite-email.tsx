import {
  Html,
  Body,
  Container,
  Head,
  Heading,
  Text,
  Hr,
  Preview,
  Section,
  Row,
  Column,
  Button,
  Link,
} from '@react-email/components'
import { Tailwind } from '@react-email/tailwind'
import * as React from 'react'

interface OrganizationInviteEmailProps {
  organizationName: string
  organizationLogo?: string
  role: 'admin' | 'member'
  inviteId: string
  expiresAt?: Date
  appUrl: string
  invitedBy: string
}

export function OrganizationInviteEmail({
  organizationName,
  organizationLogo,
  role,
  inviteId,
  expiresAt,
  appUrl,
  invitedBy,
}: OrganizationInviteEmailProps) {
  const roleLabel = role === 'admin' ? 'Administrator' : 'Member'
  const acceptUrl = `${appUrl}/?acceptInvite=${inviteId}`
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Html>
      <Tailwind>
        <Head />
        <Preview>
          You've been invited to join {organizationName} as a {roleLabel}
        </Preview>
        <Body className='bg-gray-50 font-sans'>
          <Container className='bg-white my-8 mx-auto max-w-xl rounded-lg overflow-hidden shadow-sm'>
            <Section className='bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-8'>
              <Row>
                <Column>
                  <Heading className='text-white text-2xl font-bold m-0'>
                    {organizationName}
                  </Heading>
                  <Text className='text-slate-400 text-sm m-0 mt-1'>
                    Organization Invitation
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section className='px-8 py-6'>
              <Text className='text-slate-700 text-base m-0 mb-4'>
                You've been invited by <strong>{invitedBy}</strong> to join{' '}
                <strong>{organizationName}</strong> as a{' '}
                <strong>{roleLabel}</strong>.
              </Text>

              <Section className='bg-slate-50 rounded-lg p-4 mb-6'>
                <Row>
                  <Column className='w-1/3'>
                    <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0 mb-1'>
                      Organization
                    </Text>
                    <Text className='text-slate-900 font-medium m-0'>
                      {organizationName}
                    </Text>
                  </Column>
                  <Column className='w-1/3'>
                    <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0 mb-1'>
                      Role
                    </Text>
                    <Text className='text-slate-900 font-medium m-0'>
                      {roleLabel}
                    </Text>
                  </Column>
                  {expiresLabel && (
                    <Column className='w-1/3'>
                      <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0 mb-1'>
                        Expires
                      </Text>
                      <Text className='text-slate-900 font-medium m-0'>
                        {expiresLabel}
                      </Text>
                    </Column>
                  )}
                </Row>
              </Section>

              <Section className='text-center mb-6'>
                <Button
                  href={acceptUrl}
                  className='bg-slate-900 text-white px-8 py-3 rounded-lg font-medium text-base no-underline'
                >
                  Accept Invitation
                </Button>
              </Section>

              <Text className='text-slate-500 text-sm m-0 mb-2'>
                Or copy and paste this link into your browser:
              </Text>
              <Text className='text-slate-600 text-sm m-0 mb-4 break-all'>
                <Link href={acceptUrl} className='text-blue-600 underline'>
                  {acceptUrl}
                </Link>
              </Text>

              {expiresLabel && (
                <Text className='text-slate-500 text-sm m-0'>
                  This invitation will expire on {expiresLabel}. If you don't
                  accept by then, you'll need to request a new invitation.
                </Text>
              )}
            </Section>

            <Hr className='border-gray-100 mx-8' />

            <Section className='px-8 py-4 text-center'>
              <Text className='text-slate-400 text-xs m-0'>
                If you didn't expect this invitation, you can safely ignore this
                email.
              </Text>
            </Section>

            <Section className='px-8 py-4 bg-slate-50'>
              <Row>
                <Column className='text-center'>
                  <Text className='text-slate-400 text-xs m-0'>
                    © {new Date().getFullYear()} {organizationName}. All rights
                    reserved.
                  </Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default OrganizationInviteEmail
