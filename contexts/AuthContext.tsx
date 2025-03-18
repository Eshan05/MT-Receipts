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
import { getCookie, deleteCookie, setCookie } from 'cookies-next'
import { jwtVerify, type JWTPayload } from 'jose'

export interface ContextUser {
  email: string
  username: string
  lastLogin?: Date
}

interface AuthContextProps {
  isAuthenticated: boolean
  user: ContextUser | null
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  signup: (username: string, email: string, pass: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'PGnPIUmff+6rZ1yedUq9/W0AVl7P/KKVBS4tpWLPcW0='
)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<ContextUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    const token = getCookie('authToken')
    if (token && typeof token === 'string' && token.trim() !== '') {
      try {
        const res = await fetch('/api/sessions')

        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            setUser(data.user)
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
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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
        setIsAuthenticated(true)
        router.push('/events')
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
        setIsAuthenticated(true)
        router.push('/events')
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
    router.push('/')
  }

  const contextValue: AuthContextProps = {
    isAuthenticated,
    user,
    loading,
    login,
    signup,
    logout,
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}
