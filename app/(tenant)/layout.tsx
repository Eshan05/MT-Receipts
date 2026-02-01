export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className='flex items-center justify-center min-h-screen w-full'>
      {children}
    </main>
  )
}
