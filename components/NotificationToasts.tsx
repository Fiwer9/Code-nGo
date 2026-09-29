'use client'

import Link from 'next/link'
import { AlertTriangle, WifiOff, X } from 'lucide-react'
import { useNotifications } from '@/components/NotificationsProvider'
import type { AppNotificationType } from '@/lib/notificationsStore'

const styles: Record<
  AppNotificationType,
  { border: string; icon: typeof AlertTriangle; iconClass: string }
> = {
  critical: {
    border: 'border-danger/40',
    icon: AlertTriangle,
    iconClass: 'text-danger'
  },
  warning: {
    border: 'border-warning/40',
    icon: AlertTriangle,
    iconClass: 'text-warning'
  },
  offline: {
    border: 'border-surface-400/50',
    icon: WifiOff,
    iconClass: 'text-surface-600'
  }
}

export default function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(100vw-2rem,22rem)] pointer-events-none">
      {toasts.map((t) => {
        const st = styles[t.type]
        const Icon = st.icon
        return (
          <div
            key={t.toastId}
            className={`pointer-events-auto rounded-xl border bg-surface-100/95 backdrop-blur shadow-xl shadow-black/20 p-3 animate-fadeIn ${st.border}`}
            role="status"
          >
            <div className="flex gap-3">
              <Icon size={18} className={`mt-0.5 shrink-0 ${st.iconClass}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-surface-900 leading-snug">{t.text}</div>
                <Link
                  href={`/map`}
                  className="text-xs text-primary-500 hover:text-primary-400 mt-1 inline-block"
                  onClick={() => dismissToast(t.toastId)}
                >
                  Открыть карту →
                </Link>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.toastId)}
                className="p-1 rounded-md hover:bg-surface-200 text-surface-500 shrink-0"
                aria-label="Закрыть"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
