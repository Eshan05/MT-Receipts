import { ModeToggle } from '@/components/shared/mode-toggle'
import AdminSidebar from '@/components/navigation/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { TenantThemeSync } from '@/components/organization/tenant-theme-sync'
import { ReceiptEmailBatchTrackerProvider } from '@/contexts/ReceiptEmailBatchTracker'

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ReceiptEmailBatchTrackerProvider>
        <TenantThemeSync />
        <SidebarProvider className='overflow-x-hidden'>
          <AdminSidebar />
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
              <main className='admin-children-container relative group-has-[[data-collapsible=icon]]/sidebar-wrapper:ml-0 ml-0 w-full flex justify-center @container px-4'>
                {children}
              </main>
            </section>
          </SidebarInset>
        </SidebarProvider>
      </ReceiptEmailBatchTrackerProvider>
    </AuthProvider>
  )
}
