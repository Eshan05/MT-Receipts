import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Sign In',
  description: `Sign in to ${siteConfig.name} to manage organizations, events, and receipts.`,
  alternates: { canonical: '/v' },
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
