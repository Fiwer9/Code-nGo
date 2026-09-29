import type { MapObjectStatus } from '@/lib/mockData'
import { COLLECTOR_STATUS_META } from '@/lib/collectorStatus'

export type AppNotificationType = 'critical' | 'warning' | 'offline'

export type AppNotification = {
  id: string
  type: AppNotificationType
  collectorId: string
  text: string
  createdAt: number
  read: boolean
}

const NOTIF_KEY = 'moskollector-notifications-v1'
const STATUS_KEY = 'moskollector-collector-statuses-v1'
const MAX_ITEMS = 80

export const ALERT_STATUSES: MapObjectStatus[] = ['critical', 'warning', 'offline']

export function isAlertStatus(status: MapObjectStatus): status is AppNotificationType {
  return status === 'critical' || status === 'warning' || status === 'offline'
}

export function notificationText(collectorId: string, status: AppNotificationType): string {
  if (status === 'offline') return `Коллектор ${collectorId} отключён (офлайн)`
  if (status === 'warning') return `Коллектор ${collectorId}: состояние «Внимание»`
  return `Коллектор ${collectorId}: критическое состояние`
}

export function statusLabel(status: AppNotificationType): string {
  return COLLECTOR_STATUS_META[status].label
}

export function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppNotification[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((n) => n && n.id && n.collectorId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

export function saveNotifications(items: AppNotification[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      NOTIF_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS))
    )
  } catch {
    /* quota */
  }
}

export function loadCollectorStatuses(): Record<string, MapObjectStatus> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STATUS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, MapObjectStatus>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveCollectorStatuses(map: Record<string, MapObjectStatus>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function unreadCount(items: AppNotification[]): number {
  return items.filter((n) => !n.read).length
}

export function formatNotifAge(createdAt: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - createdAt) / 1000))
  if (sec < 60) return `${sec} сек`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч`
  const d = Math.floor(h / 24)
  return `${d} д`
}

/**
 * Сравнивает предыдущие и новые статусы коллекторов.
 * Создаёт уведомления для offline / warning / critical.
 */
export function diffCollectorAlerts(
  prev: Record<string, MapObjectStatus>,
  next: Record<string, MapObjectStatus>,
  existing: AppNotification[]
): AppNotification[] {
  const created: AppNotification[] = []
  const now = Date.now()

  for (const [id, status] of Object.entries(next)) {
    if (!isAlertStatus(status)) continue
    const prevStatus = prev[id]
    // Уже в том же тревожном статусе — не спамим
    if (prevStatus === status) continue

    // Есть непрочитанное по тому же коллектору+типу за последний час
    const dup = existing.some(
      (n) =>
        !n.read &&
        n.collectorId === id &&
        n.type === status &&
        now - n.createdAt < 60 * 60 * 1000
    )
    if (dup) continue

    created.push({
      id: `n-${id}-${status}-${now}-${Math.random().toString(36).slice(2, 7)}`,
      type: status,
      collectorId: id,
      text: notificationText(id, status),
      createdAt: now,
      read: false
    })
  }

  return created
}
