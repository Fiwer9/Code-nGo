import type { MapObject, MapObjectStatus, SensorStatus } from '@/lib/mockData'
import { deriveCollectorStatus } from '@/lib/collectorStatus'

const STATUS_TO_SENSOR: Record<MapObjectStatus, SensorStatus> = {
  ok: 'online',
  warning: 'warning',
  critical: 'critical',
  offline: 'offline',
  maintenance: 'maintenance'
}

/**
 * Выставить статус коллектора через датчики + связь с заявкой.
 * Правило: статус ТО всегда требует taskId (номер заявки).
 */
export function applyCollectorOperationalStatus(
  object: MapObject,
  status: MapObjectStatus,
  ticketId?: string | number | null
): MapObject {
  if (status === 'maintenance' && (ticketId === undefined || ticketId === null || ticketId === '')) {
    throw new Error('Статус ТО можно выставить только привязав заявку')
  }

  const targetSensor = STATUS_TO_SENSOR[status]
  const sensors = object.sensors.map((s, index) => {
    if (status === 'ok') {
      return { ...s, status: 'online' as SensorStatus }
    }
    // Один «ведущий» датчик задаёт статус объекта; остальные — online (кроме offline/critical каскада)
    if (index === 0) {
      return { ...s, status: targetSensor }
    }
    if (status === 'offline' || status === 'critical') {
      return { ...s, status: targetSensor }
    }
    return { ...s, status: 'online' as SensorStatus }
  })

  let taskId: string | null | undefined = object.taskId
  const ticketKey = ticketId != null && ticketId !== '' ? String(ticketId) : null

  if (status === 'maintenance') {
    taskId = ticketKey
  } else if (ticketKey && object.taskId && String(object.taskId) === ticketKey) {
    // Снимаем ТО этой заявкой — отвязываем
    taskId = null
  }

  const next: MapObject = {
    ...object,
    sensors,
    status: deriveCollectorStatus(sensors),
    taskId: taskId ?? null
  }
  return next
}

export function findMapObjectById(objects: MapObject[], objectId: string): MapObject | undefined {
  return objects.find((o) => o.id === objectId)
}
