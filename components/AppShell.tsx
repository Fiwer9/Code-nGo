'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import { canTechnicianAccessPath, isTechnician } from '@/lib/roles'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, user, canAccessAdmin } = useAuth()
  const isLogin = pathname === '/login'
  const isAdminRoute = pathname.startsWith('/admin')
  const technicianOnly = isTechnician(user)

  useEffect(() => {
    if (loading || !user || isLogin) return
    if (technicianOnly && !canTechnicianAccessPath(pathname)) {
      router.replace('/requests')
    }
  }, [loading, user, isLogin, technicianOnly, pathname, router])

  if (isLogin) {
    return <>{children}</>
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-sm text-surface-600">Загрузка…</div>
      </div>
    )
  }

  if (isAdminRoute && !canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-sm text-surface-600">Перенаправление…</div>
      </div>
    )
  }

  if (technicianOnly && !canTechnicianAccessPath(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-sm text-surface-600">Перенаправление…</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  )
}
