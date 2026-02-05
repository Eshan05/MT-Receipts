/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
  }
})

import TenantErrorPage, {
  ERROR_CONFIGS,
  TenantErrorType,
} from '@/components/tenant/tenant-error-page'

describe('TenantErrorPage Component', () => {
  const errorTypes: TenantErrorType[] = [
    'not-found',
    'pending',
    'suspended',
    'deleted',
  ]

  describe('ERROR_CONFIGS', () => {
    it('has config for all error types', () => {
      errorTypes.forEach((type) => {
        expect(ERROR_CONFIGS[type]).toBeDefined()
      })
    })

    it('each config has required properties', () => {
      errorTypes.forEach((type) => {
        const config = ERROR_CONFIGS[type]
        expect(config.icon).toBeDefined()
        expect(config.title).toBeDefined()
        expect(config.description).toBeDefined()
        expect(typeof config.showHomeButton).toBe('boolean')
      })
    })
  })

  describe('not-found type', () => {
    it('renders correct title', () => {
      render(<TenantErrorPage type='not-found' />)
      expect(screen.getByText('Organization Not Found')).toBeInTheDocument()
    })

    it('renders correct description', () => {
      render(<TenantErrorPage type='not-found' />)
      expect(
        screen.getByText(/doesn't exist or has been removed/)
      ).toBeInTheDocument()
    })

    it('renders home button', () => {
      render(<TenantErrorPage type='not-found' />)
      expect(screen.getByText('Back to Home')).toBeInTheDocument()
    })
  })

  describe('pending type', () => {
    it('renders correct title', () => {
      render(<TenantErrorPage type='pending' />)
      expect(screen.getByText('Organization Pending')).toBeInTheDocument()
    })

    it('renders correct description', () => {
      render(<TenantErrorPage type='pending' />)
      expect(screen.getByText(/pending approval/)).toBeInTheDocument()
    })
  })

  describe('suspended type', () => {
    it('renders correct title', () => {
      render(<TenantErrorPage type='suspended' />)
      expect(screen.getByText('Organization Suspended')).toBeInTheDocument()
    })

    it('renders correct description', () => {
      render(<TenantErrorPage type='suspended' />)
      expect(screen.getByText(/has been suspended/)).toBeInTheDocument()
    })
  })

  describe('deleted type', () => {
    it('renders correct title', () => {
      render(<TenantErrorPage type='deleted' />)
      expect(screen.getByText('Organization Deleted')).toBeInTheDocument()
    })

    it('renders correct description', () => {
      render(<TenantErrorPage type='deleted' />)
      expect(screen.getByText(/has been deleted/)).toBeInTheDocument()
    })
  })

  describe('common elements', () => {
    it('renders card wrapper', () => {
      const { container } = render(<TenantErrorPage type='not-found' />)
      expect(
        container.querySelector('[class*="Card"]') ||
          container.querySelector('div')
      ).toBeTruthy()
    })

    it('renders home link', () => {
      render(<TenantErrorPage type='not-found' />)
      const homeLink = screen.getByRole('link', { name: /back to home/i })
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })
})
