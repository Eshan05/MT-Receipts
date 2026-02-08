import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'
import { ReceiptIcon, UsersIcon } from 'lucide-react'
import { LandingOrganizationsCredenza } from '@/components/landing/landing-organizations-credenza'
import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Home',
  description: siteConfig.description,
  alternates: { canonical: '/' },
}

export default function LandingPage() {
  return (
    <main className='h-svh p-4'>
      <div className='mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center'>
        <div className='w-full rounded-2xl bg-card/60 p-6 backdrop-blur sm:p-10'>
          <header className='flex flex-col items-center text-center'>
            <div className='relative'>
              <div className='absolute -inset-2 rounded-full bg-muted/60 blur' />
              <Image
                src='https://avatars.githubusercontent.com/u/140711476?v=4'
                alt='Eshan avatar'
                width={96}
                height={96}
                className='relative h-20 w-20 rounded-full border object-cover sm:h-24 sm:w-24'
                priority
              />
            </div>

            <div className='mt-5 space-y-2'>
              <div className='flex flex-wrap items-center justify-center gap-2'>
                <Badge variant='secondary'>Receipts</Badge>
                <Badge variant='secondary'>Email</Badge>
                <Badge variant='secondary'>Verification</Badge>
              </div>
              <h1 className='text-4xl font-bold tracking-tight sm:text-5xl'>
                {siteConfig.name}
              </h1>
              <p className='mx-auto max-w-prose text-sm text-muted-foreground sm:text-base'>
                {siteConfig.description}
              </p>
            </div>
          </header>

          <div className='mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center'>
            <Link href='/v' className='w-full sm:w-auto'>
              <Button className='w-full gap-2'>
                <ReceiptIcon className='h-4 w-4' />
                Sign In
              </Button>
            </Link>
            <Link href='/o' className='w-full sm:w-auto'>
              <Button variant='outline' className='w-full gap-2'>
                <UsersIcon className='h-4 w-4' />
                Create Organization
              </Button>
            </Link>
            <div className='w-full sm:w-auto'>
              <LandingOrganizationsCredenza />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
