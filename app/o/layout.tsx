'use client'

import { AuthProvider } from '@/contexts/AuthContext'

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
