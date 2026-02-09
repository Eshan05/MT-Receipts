'use client'

import { AuthProvider } from '@/contexts/AuthContext'

export function OrgAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
