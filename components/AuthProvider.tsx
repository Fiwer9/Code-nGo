'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { fetchMe, login as apiLogin, logout as apiLogout } from '@/lib/api/auth'
import { clearSession, getStoredToken, getStoredUserJson, saveSession } from '@/lib/api/client'
import type { LoginRequest, User } from '@/lib/api/types'
import { ApiError } from '@/lib/api/types'
import { canAccessAdmin, hasPermission } from '@/lib/permissions'
import { canTechnicianAccessPath, isTechnician } from '@/lib/roles'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (payload: LoginRequest) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  canAccessAdmin: boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PUBLIC_PATHS = ['/login']

function parseStoredUser(): User | null {
  const raw = getStoredUserJson()
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      return
    }
    try {
      const me = await fetchMe()
      saveSession(token, 1800, JSON.stringify(me))
      setUser(me)
    } catch {
      clearSession()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cached = parseStoredUser()
      const token = getStoredToken()
      if (!token) {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }
      if (cached && !cancelled) setUser(cached)
      try {
        const me = await fetchMe()
        if (!cancelled) {
          saveSession(token, 1800, JSON.stringify(me))
          setUser(me)
        }
      } catch {
        if (!cancelled) {
          clearSession()
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    if (!user && !isPublic) {
      router.replace('/login')
      return
    }
    if (user && pathname === '/login') {
      router.replace(isTechnician(user) ? '/requests' : '/dashboard')
      return
    }
    if (user && isTechnician(user) && !canTechnicianAccessPath(pathname)) {
      router.replace('/requests')
      return
    }
    if (user && pathname.startsWith('/admin') && !canAccessAdmin(user)) {
      router.replace(isTechnician(user) ? '/requests' : '/dashboard')
    }
  }, [loading, user, pathname, router])

  const login = useCallback(async (payload: LoginRequest) => {
    const data = await apiLogin(payload)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    router.replace('/login')
  }, [router])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      canAccessAdmin: canAccessAdmin(user),
      hasPermission: (permission: string) => hasPermission(user, permission)
    }),
    [user, loading, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useAuthOptional() {
  return useContext(AuthContext)
}

export { ApiError }
