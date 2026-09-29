import type { EquipmentItem } from '@/lib/api/monitoringTypes'
import { collectorIdOfEquipment } from '@/lib/api/monitoring'
import { collectorGeo } from '@/lib/collectorGeo'
import type { CollectorSensor, MapObject, SensorStatus } from '@/lib/mockData'
import { deriveCollectorStatus } from '@/lib/collectorStatus'

function mapSensorStatus(status: string): SensorStatus {
  const s = (status || '').toLowerCase()
  if (s.includes('critical') || s.includes('крит')) return 'critical'
  if (s.includes('off') || s.includes('не в сети')) return 'offline'
  if (s.includes('warn') || s.includes('вниман')) return 'warning'
  if (s.includes('maint') || s.includes('то') || s.includes('service')) return 'maintenance'
  return 'online'
}

function mapSensorKind(item: EquipmentItem): CollectorSensor['kind'] {
  const raw = `${item.sensor_type} ${item.type} ${item.system_type}`.toLowerCase()
  if (raw.includes('temp') || raw.includes('темп')) return 'temperature'
  if (raw.includes('smoke') || raw.includes('дым')) return 'smoke'
  if (raw.includes('gas') || raw.includes('газ')) return 'gas'
  if (raw.includes('move') || raw.includes('движ') || raw.includes('motion')) return 'movement'
  if (raw.includes('pump') || raw.includes('насос')) return 'pump'
  if (raw.includes('fan') || raw.includes('вент')) return 'fan'
  if (raw.includes('level') || raw.includes('уров')) return 'level'
  if (raw.includes('humid') || raw.includes('влаж')) return 'humidity'
  return 'temperature'
}

function toSensor(item: EquipmentItem): CollectorSensor {
  return {
    id: item.id,
    name: item.id,
    kind: mapSensorKind(item),
    status: mapSensorStatus(item.status),
    lastCheck: item.lastCheck || '—',
    place: item.location || '—',
    channel: item.id,
    readings: [
      { label: 'Тип', value: item.sensor_type || item.type || '—', unit: '', level: 'ok' },
      { label: 'Система', value: item.system_type || '—', unit: '', level: 'ok' }
    ]
  }
}

/**
 * Датчики с одним parentId = один коллектор.
 * Везде в UI id коллектора = parentId (строкой).
 */
export function collectorsFromEquipment(items: EquipmentItem[]): MapObject[] {
  const groups = new Map<string, EquipmentItem[]>()
  for (const item of items) {
    const pid = collectorIdOfEquipment(item)
    const list = groups.get(pid) || []
    list.push(item)
    groups.set(pid, list)
  }

  const result: MapObject[] = []
  for (const [parentId, sensors] of groups) {
    const geo = collectorGeo(parentId)
    const mapped = sensors.map(toSensor)
    result.push({
      id: parentId,
      type: 'Коллектор',
      len: '—',
      lat: geo.lat,
      lng: geo.lng,
      address: geo.address,
      description: `Коллектор ${parentId}. Датчиков: ${mapped.length}.`,
      sensors: mapped,
      status: deriveCollectorStatus(mapped),
      taskId: null
    })
  }

  return result.sort((a, b) => a.id.localeCompare(b.id, 'ru', { numeric: true }))
}
