'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { collectorsFromEquipment } from '@/lib/collectorsFromEquipment'
import { getEquipmentCached, peekEquipmentCache } from '@/lib/equipmentCache'
import type { MapObjectStatus } from '@/lib/mockData'
import {
  diffCollectorAlerts,
  loadCollectorStatuses,
  loadNotifications,
  saveCollectorStatuses,
  saveNotifications,
  unreadCount,
  type AppNotification
} from '@/lib/notificationsStore'
import { useAuth } from '@/components/AuthProvider'

const POLL_MS = 45_000

type ToastItem = AppNotification & { toastId: string }

type NotificationsContextValue = {
  notifications: AppNotification[]
  unread: number
  toasts: ToastItem[]
  markAllRead: () => void
  dismissToast: (toastId: string) => void
  refreshNow: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const statusesRef = useRef<Record<string, MapObjectStatus>>({})

  useEffect(() => {
    if (!user) return
    setNotifications(loadNotifications())
    statusesRef.current = loadCollectorStatuses()
  }, [user])

  const persistNotifs = useCallback((items: AppNotification[]) => {
    setNotifications(items)
    saveNotifications(items)
  }, [])

  const pushToasts = useCallback((items: AppNotification[]) => {
    if (!items.length) return
    const batch = items.map((n) => ({
      ...n,
      toastId: `t-${n.id}`
    }))
    setToasts((prev) => [...batch, ...prev].slice(0, 5))
    for (const t of batch) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.toastId !== t.toastId))
      }, 6500)
    }
  }, [])

  const applySnapshot = useCallback(
    (statusMap: Record<string, MapObjectStatus>, emitToasts: boolean) => {
      const prev = statusesRef.current
      const existing = loadNotifications()
      const created = diffCollectorAlerts(prev, statusMap, existing)
      statusesRef.current = statusMap
      saveCollectorStatuses(statusMap)

      if (created.length) {
        const next = [...created, ...existing].slice(0, 80)
        persistNotifs(next)
        if (emitToasts) pushToasts(created)
      }
    },
    [persistNotifs, pushToasts]
  )

  const scanEquipment = useCallback(
    async (opts?: { force?: boolean; toast?: boolean }) => {
      if (!user) return
      try {
        // Сначала быстрый снимок из кеша (если есть)
        if (!opts?.force) {
          const peek = peekEquipmentCache()
          if (peek?.items?.length) {
            const map: Record<string, MapObjectStatus> = {}
            for (const c of collectorsFromEquipment(peek.items)) {
              map[c.id] = c.status || 'ok'
            }
            // Первый проход после логина: создаём уведомления по текущим offline/warning/critical,
            // но тосты только если уже были сохранённые статусы (не «холодный» первый заход спамит всем)
            const hadPrev = Object.keys(statusesRef.current).length > 0
            applySnapshot(map, Boolean(opts?.toast && hadPrev))
          }
        }

        const data = await getEquipmentCached({ force: opts?.force ?? true })
        const map: Record<string, MapObjectStatus> = {}
        for (const c of collectorsFromEquipment(data.items || [])) {
          map[c.id] = c.status || 'ok'
        }
        const hadPrev = Object.keys(statusesRef.current).length > 0
        // Первый полный снимок: уведомления в колокольчик без тостов (чтобы не засыпать при входе)
        // Последующие опросы: и список, и тосты
        applySnapshot(map, hadPrev || Boolean(opts?.toast))
      } catch {
        /* сеть — тихо */
      }
    },
    [user, applySnapshot]
  )

  useEffect(() => {
    if (!user) return
    void scanEquipment({ force: false, toast: false })
    const id = window.setInterval(() => {
      void scanEquipment({ force: true, toast: true })
    }, POLL_MS)
    const onFocus = () => {
      void scanEquipment({ force: true, toast: true })
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, scanEquipment])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      saveNotifications(next)
      return next
    })
  }, [])

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId))
  }, [])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unread: unreadCount(notifications),
      toasts,
      markAllRead,
      dismissToast,
      refreshNow: () => scanEquipment({ force: true, toast: true })
    }),
    [notifications, toasts, markAllRead, dismissToast, scanEquipment]
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}
