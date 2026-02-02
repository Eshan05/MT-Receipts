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
          include: [
            '__tests__/models/**/*.test.ts',
            '__tests__/lib/db/**/*.test.ts',
            '__tests__/lib/redis.test.ts',
            '__tests__/lib/organization-context.test.ts',
            '__tests__/lib/encryption.test.ts',
            '__tests__/api/**/*.test.ts',
          ],
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
