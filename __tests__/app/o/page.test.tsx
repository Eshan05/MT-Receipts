/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CreateOrgPage from '@/app/o/page'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: vi.fn() }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
  }),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/organization/join-with-code-credenza', () => ({
  JoinWithCodeCredenza: () => null,
}))

vi.mock('@/components/organization/invitations-applications-credenza', () => ({
  InvitationsApplicationsCredenza: () => null,
}))

describe('CreateOrgPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', () => {
    render(<CreateOrgPage />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('Create Organization')
  })

  it('renders organization name field', () => {
    render(<CreateOrgPage />)
    const nameInput = screen.getByPlaceholderText(
      /Association of Computer Engineers/
    )
    expect(nameInput).toBeInTheDocument()
  })

  it('renders slug field', () => {
    render(<CreateOrgPage />)
    expect(screen.getByText(/Organization Slug/i)).toBeInTheDocument()
  })

  it('renders create button', () => {
    render(<CreateOrgPage />)
    expect(
      screen.getByRole('button', { name: /create organization/i })
    ).toBeInTheDocument()
  })

  it('renders cancel button', () => {
    render(<CreateOrgPage />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows join with code section', () => {
    render(<CreateOrgPage />)
    expect(
      screen.getByText(/already have an invite or pending application/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /join with code/i })
    ).toBeInTheDocument()
  })

  it('shows view invitations button', () => {
    render(<CreateOrgPage />)
    expect(
      screen.getByRole('button', { name: /view invitations/i })
    ).toBeInTheDocument()
  })

  it('shows slug hint text', () => {
    render(<CreateOrgPage />)
    expect(screen.getByText(/Used in URLs/)).toBeInTheDocument()
  })
})
