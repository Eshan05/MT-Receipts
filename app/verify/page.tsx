import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/lib/site'
import VerifyForm from './verify-form'

export const metadata: Metadata = {
  title: 'Verify',
  description: 'Verify a receipt certificate ID.',
  alternates: { canonical: '/verify' },
  openGraph: {
    type: 'website',
    url: `${siteConfig.url}/verify`,
    title: `Verify Receipt | ${siteConfig.name}`,
    description: 'Verify a receipt certificate ID.',
    siteName: siteConfig.name,
    locale: 'en_US',
  },
}

export default function VerifyPage() {
  return (
    <main className='h-svh p-4'>
      <div className='mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center'>
        <div className='w-full rounded-2xl bg-card/60 p-4 backdrop-blur sm:p-10'>
          <header className='flex flex-col gap-1 text-center'>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              Verify Receipt
            </h1>
            <p className='text-sm text-muted-foreground'>
              Enter a certificate ID, or paste a verification link.
            </p>
          </header>

          <div className='mt-7'>
            <VerifyForm />
          </div>

          <div className='mt-6 flex items-center justify-center gap-2'>
            <Link href='/'>
              <Button variant='outline' size='sm'>
                Back to Home
              </Button>
            </Link>
            <Link href='/v'>
              <Button variant='ghost' size='sm'>
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
