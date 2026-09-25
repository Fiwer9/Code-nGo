import type { CollectorSensor, MapObjectStatus, SensorStatus } from './mockData'

/**
 * Статус коллектора на карте = худший статус среди датчиков.
 * Показания (readings.level) на цвет метки не влияют — они только в карточке датчика.
 *
 * Приоритет: critical → offline → warning → maintenance → ok
 */
const STATUS_PRIORITY: Record<SensorStatus, number> = {
  critical: 5,
  offline: 4,
  warning: 3,
  maintenance: 2,
  online: 1
}

const SENSOR_TO_COLLECTOR: Record<SensorStatus, MapObjectStatus> = {
  critical: 'critical',
  offline: 'offline',
  warning: 'warning',
  maintenance: 'maintenance',
  online: 'ok'
}

export function deriveCollectorStatus(sensors: CollectorSensor[]): MapObjectStatus {
  if (!sensors.length) return 'offline'

  let worst: SensorStatus = 'online'
  for (const s of sensors) {
    if (STATUS_PRIORITY[s.status] > STATUS_PRIORITY[worst]) {
      worst = s.status
    }
  }

  return SENSOR_TO_COLLECTOR[worst]
}

export const COLLECTOR_STATUS_META: Record<
  MapObjectStatus,
  { label: string; markerClass: string; color: string }
> = {
  ok: { label: 'В норме', markerClass: 'bg-success', color: '#22c55e' },
  warning: { label: 'Внимание', markerClass: 'bg-warning', color: '#f59e0b' },
  critical: { label: 'Критический', markerClass: 'bg-danger', color: '#ef4444' },
  offline: { label: 'Офлайн', markerClass: 'bg-surface-500', color: '#6b7280' },
  maintenance: { label: 'ТО', markerClass: 'bg-info', color: '#3b82f6' }
}

/** Позиция попапа рядом с кликом, с подгонкой под края контейнера */
export function placePopupNearPoint(
  clickX: number,
  clickY: number,
  containerW: number,
  containerH: number,
  popupW = 380,
  popupH = 360
): { x: number; y: number } {
  const gap = 14
  let x = clickX + gap
  let y = clickY - 40

  if (x + popupW > containerW - 8) x = clickX - popupW - gap
  if (x < 8) x = 8
  if (y + popupH > containerH - 8) y = Math.max(8, containerH - popupH - 8)
  if (y < 8) y = 8

  return { x, y }
}
