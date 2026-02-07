import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { ReceiptIcon, UsersIcon } from 'lucide-react'
import { LandingOrganizationsCredenza } from '@/components/landing/landing-organizations-credenza'

export default function LandingPage() {
  return (
    <main className='flex flex-col items-center justify-center min-h-screen p-4'>
      <div className='flex flex-col items-center gap-6 max-w-md w-full text-center'>
        <Image
          src='https://avatars.githubusercontent.com/u/140711476?v=4'
          alt='ACES Logo'
          width={100}
          height={100}
          className='w-24 h-24 rounded-full'
        />

        <div className='space-y-2'>
          <h1 className='text-4xl font-bold tracking-tight'>ACES Receipts</h1>
          <p className='text-muted-foreground'>
            Generate and manage receipts for your organization's events
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4'>
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
          <LandingOrganizationsCredenza />
        </div>
      </div>
    </main>
  )
}
