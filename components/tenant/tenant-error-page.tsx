import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Building2Icon,
  HomeIcon,
  ClockIcon,
  BanIcon,
  Trash2Icon,
} from 'lucide-react'
import Link from 'next/link'

export type TenantErrorType = 'not-found' | 'pending' | 'suspended' | 'deleted'

interface TenantErrorConfig {
  icon: typeof Building2Icon
  title: string
  description: string
  showHomeButton: boolean
}

const ERROR_CONFIGS: Record<TenantErrorType, TenantErrorConfig> = {
  'not-found': {
    icon: Building2Icon,
    title: 'Organization Not Found',
    description:
      "The organization you're looking for doesn't exist or has been removed. Please check the URL and try again.",
    showHomeButton: true,
  },
  pending: {
    icon: ClockIcon,
    title: 'Organization Pending Approval',
    description:
      'This organization is currently pending approval. You will be able to access it once an administrator approves it.',
    showHomeButton: true,
  },
  suspended: {
    icon: BanIcon,
    title: 'Organization Suspended',
    description:
      'This organization has been suspended. Please contact support if you believe this is an error.',
    showHomeButton: true,
  },
  deleted: {
    icon: Trash2Icon,
    title: 'Organization Deleted',
    description:
      'This organization has been deleted and is no longer accessible. Contact support if you need to restore it.',
    showHomeButton: true,
  },
}

interface TenantErrorPageProps {
  type: TenantErrorType
}

export default function TenantErrorPage({ type }: TenantErrorPageProps) {
  const config = ERROR_CONFIGS[type]
  const Icon = config.icon

  return (
    <div className='flex min-h-[80vh] w-full items-center justify-center bg-background px-4 py-12'>
      <Card className='relative overflow-hidden border-none bg-gradient-to-br from-background to-muted p-8 shadow-xl max-w-md w-full'>
        <div className='absolute right-0 top-0 h-32 w-32 rotate-45 bg-gradient-to-br from-destructive/20 to-destructive/10' />

        <div className='relative z-10 flex flex-col items-center text-center'>
          <div className='mb-4 flex items-center justify-center rounded-full bg-muted p-3'>
            <Icon className='h-12 w-12 text-destructive' />
          </div>

          <h1 className='mb-2 text-3xl font-bold tracking-tight'>
            {config.title}
          </h1>

          <p className='mb-8 text-muted-foreground'>{config.description}</p>

          {config.showHomeButton && (
            <div className='flex flex-col gap-4 sm:flex-row'>
              <Link href='/' className='w-full sm:w-auto'>
                <Button className='gap-2 w-full'>
                  <HomeIcon className='h-4 w-4' />
                  Back to Home
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export { ERROR_CONFIGS }
