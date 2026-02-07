/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type {
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
  PropsWithChildren,
} from 'react'
import LandingPage from '@/app/page'

type MockNextImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  alt: string
}

type MockNextLinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: MockNextImageProps) => (
    <img src={src} alt={alt} className={className} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: MockNextLinkProps) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/landing/landing-organizations-credenza', () => ({
  LandingOrganizationsCredenza: () => <button>My Organizations</button>,
}))

describe('LandingPage', () => {
  it('renders the logo', () => {
    render(<LandingPage />)
    const logo = screen.getByAltText('ACES Logo')
    expect(logo).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(<LandingPage />)
    expect(screen.getByText('ACES Receipts')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<LandingPage />)
    expect(screen.getByText(/Generate and manage receipts/)).toBeInTheDocument()
  })

  it('renders Sign In button with correct link', () => {
    render(<LandingPage />)
    const signInLink = screen.getByRole('link', { name: /sign in/i })
    expect(signInLink).toHaveAttribute('href', '/v')
  })

  it('renders Create Organization button with correct link', () => {
    render(<LandingPage />)
    const createOrgLink = screen.getByRole('link', {
      name: /create organization/i,
    })
    expect(createOrgLink).toHaveAttribute('href', '/o')
  })

  it('has correct layout structure', () => {
    const { container } = render(<LandingPage />)
    const main = container.querySelector('main')
    expect(main).toHaveClass('flex')
    expect(main).toHaveClass('flex-col')
    expect(main).toHaveClass('items-center')
  })
})
