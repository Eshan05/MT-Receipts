import { AuthProvider } from '@/contexts/AuthContext'

export default function VLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AuthProvider>{children}</AuthProvider>
}
