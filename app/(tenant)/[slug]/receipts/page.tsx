'use client'

import { Button } from '@/components/ui/button'
import { getAllTemplateInfo } from '@/lib/templates'
import type { TemplateInfo } from '@/lib/templates/types'
import { CalendarDays, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ReceiptForm } from './_components/receipt-form'
import { useParams } from 'next/navigation'

export default function ReceiptsPage() {
  const params = useParams()
  const slug = params.slug as string
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTemplates(getAllTemplateInfo())
    setLoading(false)
  }, [])

  return (
    <div className='container py-2 pb-24'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl font-semibold shadow-heading'>
            Make Receipts
          </h1>
          <div className='flex items-center gap-2 flex-wrap justify-end'>
            <Button variant='outline' size='sm' className='gap-1.5' asChild>
              <Link href={`/${slug}/events`}>
                <CalendarDays className='w-4 h-4' />
                View Events
              </Link>
            </Button>
            <Button variant='outline' size='sm' className='gap-1.5' asChild>
              <Link href={`/${slug}/templates`}>
                <FileText className='w-4 h-4' />
                View Receipts
              </Link>
            </Button>
          </div>
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          Create receipts for your events. Select an event, fill in customer
          details, add items, and preview the receipt before generating.
        </p>
      </header>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <ReceiptForm templates={templates} />
      )}
    </div>
  )
}
