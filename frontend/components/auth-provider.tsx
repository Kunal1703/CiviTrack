'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  type AuthUser,
  type RegisterInput,
} from '@/lib/auth-api'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * App-wide auth state. Loads the current session once on mount via /auth/me
 * (httpOnly cookie), and exposes login/register/logout. This is convenience
 * state for the UI — the gateway independently enforces authorization on every
 * protected request, so tampering with this state grants no access.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setUser(await apiMe())
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    apiMe(ctrl.signal)
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const u = await apiRegister(input)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
