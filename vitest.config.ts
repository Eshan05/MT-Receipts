import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const sharedConfig = {
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
}

export default defineConfig({
  ...sharedConfig,
  test: {
    projects: [
      {
        ...sharedConfig,
        test: {
          name: 'mongodb',
          globals: true,
          environment: 'node',
          setupFiles: ['./__tests__/setup.ts'],
          pool: 'forks',
          fileParallelism: false,
          maxWorkers: 1,
          include: [
            '__tests__/models/**/*.test.ts',
            '__tests__/lib/db/**/*.test.ts',
            '__tests__/lib/redis.test.ts',
            '__tests__/lib/organization-context.test.ts',
            '__tests__/lib/encryption.test.ts',
            '__tests__/lib/receipt-email-batches.test.ts',
            '__tests__/api/**/*.test.ts',
            '__tests__/tenant/**/*.test.ts',
          ],
          exclude: ['__tests__/api/superadmin/**/*.test.ts'],
          testTimeout: 300000,
          hookTimeout: 600000,
          maxConcurrency: 1,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          setupFiles: ['./__tests__/setup-lightweight.ts'],
          include: [
            '__tests__/lib/middleware-helpers.test.ts',
            '__tests__/lib/auth.test.ts',
            '__tests__/lib/auth-server.test.ts',
            '__tests__/lib/auth-client.test.ts',
            '__tests__/lib/tenant-route.test.ts',
            '__tests__/lib/superadmin-route.test.ts',
            '__tests__/lib/receipt-number.test.ts',
            '__tests__/lib/organization-branding.test.ts',
            '__tests__/lib/rate-limiter.test.ts',
            '__tests__/lib/tenants-audit-log.test.ts',
            '__tests__/lib/tenants-limits.test.ts',
            '__tests__/lib/tenants-quota-enforcement.test.ts',
            '__tests__/lib/tenants-smtp-vault-crypto.test.ts',
            '__tests__/lib/tenants-smtp-vault-client.test.ts',
            '__tests__/lib/tenants-rate-limits.test.ts',
            '__tests__/lib/b2-s3.test.ts',
            '__tests__/lib/csv-parser.test.ts',
            '__tests__/lib/csv-validation-worker.test.ts',
            '__tests__/lib/queue/**/*.test.ts',
            '__tests__/api/superadmin/**/*.test.ts',
          ],
          testTimeout: 30000,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'components',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./__tests__/setup-components.ts'],
          include: [
            '__tests__/components/**/*.test.tsx',
            '__tests__/app/**/*.test.tsx',
          ],
          testTimeout: 30000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'models/**/*.ts'],
      exclude: ['__tests__/**'],
    },
  },
})
