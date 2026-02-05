import { ModeToggle } from '@/components/extra/mode-toggle'
import SuperadminSidebar from '@/components/navigation/superadmin-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AuthProvider } from '@/contexts/AuthContext'

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <SidebarProvider className='overflow-x-hidden'>
        <SuperadminSidebar />
        <SidebarInset className='group-has[[data-collapsible=icon]]/sidebar-wrapper:w-10'>
          <section className='transition-[margin] ease-linear'>
            <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 group-has-[[data-collapsible=icon]]/sidebar-wrapper:ml-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-full'>
              <div className='flex items-center gap-2 px-4 justify-between w-full'>
                <aside className='flex items-center gap-2'>
                  <SidebarTrigger className='-ml-1' />
                </aside>
                <aside>
                  <ModeToggle />
                </aside>
              </div>
            </header>
            <main className='relative ml-0 w-full flex justify-center @container px-4'>
              {children}
            </main>
          </section>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
