'use client'

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

export interface ContextUser {
  id: string
  email: string
  username: string
  isSuperAdmin: boolean
}

export interface Membership {
  organizationId: string
  organizationSlug: string
  organizationName: string
  role: 'admin' | 'member'
  organizationLogoUrl?: string
  organizationDescription?: string
  organizationStatus?: string
  organizationCreatedAt?: string
  organizationExpectedMembers?: number
}

export interface CurrentOrganization {
  id: string
  slug: string
  name: string
  role: 'admin' | 'member'
}

interface AuthContextProps {
  isAuthenticated: boolean
  user: ContextUser | null
  memberships: Membership[]
  currentOrganization: CurrentOrganization | null
  hasOrganizations: boolean
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  signup: (username: string, email: string, pass: string) => Promise<void>
  logout: () => void
  switchOrganization: (slug: string) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

interface AuthProviderProps {
  children: ReactNode
  autoRefresh?: boolean
}

export function AuthProvider({
  children,
  autoRefresh = true,
}: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<ContextUser | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [currentOrganization, setCurrentOrganization] =
    useState<CurrentOrganization | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  const hasOrganizations = memberships.length > 0

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')

      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
          setMemberships(data.memberships || [])
          setCurrentOrganization(data.currentOrganization || null)
          setIsAuthenticated(true)
        } else {
          logout()
        }
      } else {
        logout()
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
      logout()
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    if (autoRefresh) {
      refreshSession()
      return
    }

    setLoading(false)
  }, [autoRefresh, refreshSession])

  const login = async (email: string, pass: string) => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setMemberships(data.memberships || [])
        setCurrentOrganization(data.currentOrganization || null)
        setIsAuthenticated(true)

        if (data.currentOrganization) {
          router.push(`/${data.currentOrganization.slug}/events`)
        } else if (data.memberships && data.memberships.length > 0) {
          const firstOrg = data.memberships[0]
          router.push(`/${firstOrg.organizationSlug}/events`)
        } else {
          router.push('/o')
        }
      }
    } else {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Login failed')
    }
  }

  const signup = async (username: string, email: string, pass: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: pass }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setMemberships([])
        setCurrentOrganization(null)
        setIsAuthenticated(true)
        router.push('/o')
      }
    } else {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Signup failed')
    }
  }

  const logout = async () => {
    await fetch('/api/sessions', { method: 'DELETE' })
    setIsAuthenticated(false)
    setUser(null)
    setMemberships([])
    setCurrentOrganization(null)
    router.push('/')
  }

  const switchOrganization = async (slug: string) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch', organizationSlug: slug }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.currentOrganization) {
          setCurrentOrganization(data.currentOrganization)
          router.push(`/${slug}/events`)
        }
      } else {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to switch organization')
      }
    } catch (error) {
      throw error
    }
  }

  const contextValue: AuthContextProps = {
    isAuthenticated,
    user,
    memberships,
    currentOrganization,
    hasOrganizations,
    loading,
    login,
    signup,
    logout,
    switchOrganization,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}
