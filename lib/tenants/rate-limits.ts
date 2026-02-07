export interface RateLimitPolicy {
  name: string
  limit: number
  windowSeconds: number
}

// Defaults are conservative and intended to prevent noisy-neighbor abuse.
// These can be overridden later by env/config or per-org plans.
export const RATE_LIMITS = {
  tenantApiRequests: {
    name: 'tenant_api_requests',
    limit: 300,
    windowSeconds: 60,
  },
  receiptCreate: {
    name: 'receipt_create',
    limit: 60,
    windowSeconds: 60,
  },
  receiptEmailSend: {
    name: 'receipt_email_send',
    limit: 20,
    windowSeconds: 60 * 60,
  },
  inviteCreate: {
    name: 'invite_create',
    limit: 20,
    windowSeconds: 60 * 60,
  },
  smtpVaultWrite: {
    name: 'smtp_vault_write',
    limit: 30,
    windowSeconds: 60 * 60,
  },
  loginAttemptsPerIp: {
    name: 'login_attempts_ip',
    limit: 30,
    windowSeconds: 60 * 10,
  },
  loginAttemptsPerIpEmail: {
    name: 'login_attempts_ip_email',
    limit: 10,
    windowSeconds: 60 * 10,
  },
  joinInviteCodeAttemptsPerIp: {
    name: 'join_invite_code_attempts_ip',
    limit: 30,
    windowSeconds: 60 * 10,
  },
  superadminBackupsRun: {
    name: 'superadmin_backups_run',
    limit: 3,
    windowSeconds: 60 * 60,
  },
} satisfies Record<string, RateLimitPolicy>
