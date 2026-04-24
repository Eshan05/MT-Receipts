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
import { siteConfig } from '@/lib/site'

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
    const logo = screen.getByAltText(`${siteConfig.name} logo`)
    expect(logo).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(<LandingPage />)
    expect(screen.getByText(siteConfig.name)).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<LandingPage />)
    expect(
      screen.getByText(/Generate, email, and verify event receipts/)
    ).toBeInTheDocument()
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

  it('renders Verify button with correct link', () => {
    render(<LandingPage />)
    const verifyLink = screen.getByRole('link', { name: /verify/i })
    expect(verifyLink).toHaveAttribute('href', '/verify')
  })

  it('has correct layout structure', () => {
    const { container } = render(<LandingPage />)
    const main = container.querySelector('main')
    expect(main).toHaveClass('h-svh')
  })
})
