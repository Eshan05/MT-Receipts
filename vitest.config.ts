import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts', './__tests__/setup-components.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    testTimeout: 300000,
    hookTimeout: 600000,
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'models/**/*.ts'],
      exclude: ['__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
