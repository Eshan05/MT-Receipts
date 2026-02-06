'use client'

import { Mail, ShieldCheck, User } from 'lucide-react'
import type { SmtpVaultMeta } from '@/lib/tenants/smtp-vault-client'

interface SenderSelectViewProps {
  vault: SmtpVaultMeta
  showDefaultBadge?: boolean
}

export function SenderSelectView({
  vault,
  showDefaultBadge = true,
}: SenderSelectViewProps) {
  const avatarUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(vault.email)}`
  const displayName = vault.label?.trim() || vault.email.split('@')[0]

  return (
    <div className='flex items-center gap-2 min-w-0 w-full'>
      <img
        src={avatarUrl}
        alt={vault.email}
        className='size-6 rounded-full shrink-0 bg-muted'
      />
      <div className='flex flex-col min-w-0 flex-1'>
        <div className='flex items-center gap-1 min-w-0'>
          <User className='size-3 text-muted-foreground shrink-0' />
          <span className='truncate text-xs font-medium'>{displayName}</span>
        </div>
        <div className='flex items-center gap-1 min-w-0'>
          <Mail className='size-3 text-muted-foreground shrink-0' />
          <span className='truncate text-tiny text-muted-foreground'>
            {vault.email}
          </span>
        </div>
      </div>
      {showDefaultBadge && vault.isDefault && (
        <span className='inline-flex items-center gap-1 text-tiny text-emerald-600 shrink-0'>
          <ShieldCheck className='size-3' />
          Default
        </span>
      )}
    </div>
  )
}
