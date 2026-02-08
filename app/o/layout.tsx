import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'
import { OrgAuthProvider } from '@/contexts/org-auth-provider'

export const metadata: Metadata = {
  title: 'Create Organization',
  description: `Create an organization in ${siteConfig.name} to start generating receipts.`,
  alternates: { canonical: '/o' },
  robots: { index: false, follow: true },
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <OrgAuthProvider>{children}</OrgAuthProvider>
}
