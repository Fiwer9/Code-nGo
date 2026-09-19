'use client'
import { Bell, Search, Sun, Moon, User, LogOut } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const { theme, toggle } = useTheme()
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

  const notifications = [
    { id: 1, type: 'critical', text: 'Критический инцидент: МК-6.7.8, подтопление', time: '5 мин' },
    { id: 2, type: 'warning',  text: 'Прогноз пожара: МК-2.2.2, вероятность 78%',   time: '12 мин' },
    { id: 3, type: 'info',     text: 'Модель обновлена: Precision 92.4%',            time: '1 ч' }
  ]

  const typeColors: Record<string, string> = {
    critical: 'bg-danger', warning: 'bg-warning', info: 'bg-info'
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-surface-200 px-6 py-3 flex items-center gap-4">
      {/* Поиск */}
      <div className="flex-1 max-w-md relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Поиск по объектам, датчикам, инцидентам..."
          className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Тема */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-surface-900 transition"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Уведомления */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif(v => !v); setShowUser(false) }}
            className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-surface-900 transition relative"
            aria-expanded={showNotif}
            aria-haspopup="true"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse-ring" />
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-96 bg-surface-100 border border-surface-200 rounded-xl shadow-xl shadow-surface-900/10 dark:shadow-black/50 animate-fadeIn">
              <div className="p-4 border-b border-surface-200">
                <div className="font-semibold">Уведомления</div>
                <div className="text-xs text-surface-500">3 новых события</div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 border-b border-surface-200 hover:bg-surface-200/50 cursor-pointer">
                    <div className="flex gap-3">
                      <div className={clsx('w-2 h-2 rounded-full mt-2 flex-shrink-0', typeColors[n.type])} />
                      <div className="flex-1">
                        <div className="text-sm text-surface-900">{n.text}</div>
                        <div className="text-xs text-surface-500 mt-1">{n.time} назад</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 text-center">
                <Link
                  href="/predictions"
                  className="text-sm text-primary-400 hover:text-primary-300"
                  onClick={() => setShowNotif(false)}
                >
                  Показать все →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Пользователь */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUser(v => !v); setShowNotif(false) }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-200 transition"
            aria-expanded={showUser}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
              ДС
            </div>
            <div className="text-left hidden md:block">
              <div className="text-sm font-medium text-surface-900">Дмитрий С.</div>
              <div className="text-xs text-surface-500">Диспетчер ОДС</div>
            </div>
          </button>

          {showUser && (
            <div className="absolute right-0 top-12 w-64 bg-surface-100 border border-surface-200 rounded-xl shadow-xl shadow-surface-900/10 dark:shadow-black/50 animate-fadeIn">
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-3 hover:bg-surface-200/50 rounded-t-xl"
                onClick={() => setShowUser(false)}
              >
                <User size={16} />
                <span className="text-sm">Профиль</span>
              </Link>
              <button className="w-full flex items-center gap-3 p-3 hover:bg-surface-200/50 text-danger rounded-b-xl">
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

function clsx(...args: any[]) {
  return args.filter(Boolean).join(' ')
}
