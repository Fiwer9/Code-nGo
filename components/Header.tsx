'use client'

import { Bell, Search, Sun, Moon, User, LogOut, MapPin } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAuth } from './AuthProvider'
import { useNotifications } from './NotificationsProvider'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { userRolesLabel } from '@/lib/roles'
import { formatNotifAge, type AppNotificationType } from '@/lib/notificationsStore'

function initials(user: { name: string; surname: string }) {
  const a = user.name?.[0] || ''
  const b = user.surname?.[0] || ''
  return `${a}${b}`.toUpperCase() || '?'
}

function shortName(user: { name: string; surname: string }) {
  const s = user.surname?.[0] ? `${user.surname[0]}.` : ''
  return `${user.name} ${s}`.trim()
}

const typeColors: Record<AppNotificationType, string> = {
  critical: 'bg-danger',
  warning: 'bg-warning',
  offline: 'bg-surface-500'
}

export default function Header() {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const { notifications, unread, markAllRead } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showNotif && !showUser) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (showNotif && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotif(false)
      }
      if (showUser && userRef.current && !userRef.current.contains(target)) {
        setShowUser(false)
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotif(false)
        setShowUser(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showNotif, showUser])

  const openNotif = () => {
    setShowNotif((v) => {
      const next = !v
      if (next) markAllRead()
      return next
    })
    setShowUser(false)
  }

  const roleLabel = userRolesLabel(user) || user?.jobtitle || 'Пользователь'

  return (
    <header className="sticky top-0 z-40 glass border-b border-surface-200 px-6 py-3 flex items-center gap-4">
      <div className="flex-1 max-w-md relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Поиск по объектам, датчикам, инцидентам..."
          className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-surface-900 transition"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={openNotif}
            className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-surface-900 transition relative"
            aria-expanded={showNotif}
            aria-haspopup="true"
            aria-label="Уведомления"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse-ring" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-96 bg-surface-100 border border-surface-200 rounded-xl shadow-xl shadow-surface-900/10 dark:shadow-black/50 animate-fadeIn">
              <div className="p-4 border-b border-surface-200">
                <div className="font-semibold">Уведомления</div>
                <div className="text-xs text-surface-500">
                  {notifications.length === 0
                    ? 'Нет событий'
                    : unread > 0
                      ? `${unread} новых`
                      : 'Все прочитаны'}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-surface-500">
                    Нет уведомлений по коллекторам
                  </div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href="/map"
                      onClick={() => setShowNotif(false)}
                      className={`block p-3 border-b border-surface-200 hover:bg-surface-200/50 ${
                        n.read ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${typeColors[n.type]}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-surface-900">{n.text}</div>
                          <div className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                            <MapPin size={10} />
                            <span className="font-mono">{n.collectorId}</span>
                            <span>· {formatNotifAge(n.createdAt)} назад</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="p-3 text-center border-t border-surface-200">
                <Link
                  href="/map"
                  className="text-sm text-primary-400 hover:text-primary-300"
                  onClick={() => setShowNotif(false)}
                >
                  Открыть карту →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setShowUser((v) => !v)
              setShowNotif(false)
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-200 transition"
            aria-expanded={showUser}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
              {user ? initials(user) : '—'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-sm font-medium text-surface-900">
                {user ? shortName(user) : 'Гость'}
              </div>
              <div className="text-xs text-surface-500">{roleLabel}</div>
            </div>
          </button>

          {showUser && (
            <div className="absolute right-0 top-12 w-64 bg-surface-100 border border-surface-200 rounded-xl shadow-xl shadow-surface-900/10 dark:shadow-black/50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-surface-200">
                <div className="text-sm font-medium text-surface-900 truncate">
                  {user ? `${user.surname} ${user.name}` : ''}
                </div>
                <div className="text-xs text-surface-500 truncate">{user?.email}</div>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-3 p-3 hover:bg-surface-200/50"
                onClick={() => setShowUser(false)}
              >
                <User size={16} />
                <span className="text-sm">Профиль</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowUser(false)
                  logout()
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-surface-200/50 text-danger rounded-b-xl"
              >
                <LogOut size={16} />
                <span className="text-sm">Выйти</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
