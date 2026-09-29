import { mapObjects as defaults, type MapObject } from './mockData'
import { deriveCollectorStatus } from './collectorStatus'

/** v4: чистый старт без фейковых/устаревших связей заявок на карте */
const STORAGE_KEY = 'moskollector-map-objects-v4'
const LEGACY_KEYS = [
  'moskollector-map-objects-v3',
  'moskollector-map-objects-v2',
  'moskollector-map-objects'
]

function sanitizeObject(o: MapObject, opts?: { dropTaskLinks?: boolean }): MapObject {
  const sensors = o.sensors.map((s) => ({ ...s, readings: s.readings.map((r) => ({ ...r })) }))
  let next: MapObject = {
    ...o,
    sensors,
    taskId: opts?.dropTaskLinks ? null : o.taskId ?? null
  }

  // Фейковые заявки вида ZAY-… или нечисловые — убираем
  if (next.taskId != null && !/^\d+$/.test(String(next.taskId))) {
    next = { ...next, taskId: null }
  }

  const status = deriveCollectorStatus(next.sensors)
  // ТО без реальной заявки запрещён — возвращаем датчики в online
  if (status === 'maintenance' && !next.taskId) {
    next = {
      ...next,
      sensors: next.sensors.map((s) =>
        s.status === 'maintenance' ? { ...s, status: 'online' as const } : s
      ),
      taskId: null
    }
  }

  return {
    ...next,
    status: deriveCollectorStatus(next.sensors)
  }
}

function cloneDefaults(): MapObject[] {
  return defaults.map((o) => sanitizeObject({
    ...o,
    sensors: o.sensors.map((s) => ({ ...s, readings: s.readings.map((r) => ({ ...r })) }))
  }))
}

/** Загрузить объекты: правки из localStorage поверх демо-данных */
export function loadMapObjects(): MapObject[] {
  if (typeof window === 'undefined') return cloneDefaults()

  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // одноразовая миграция со старых ключей — без фейковых заявок
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key)
        if (!legacy) continue
        if (key === 'moskollector-map-objects') {
          const overrides = JSON.parse(legacy) as Record<string, { lat: number; lng: number }>
          const migrated = cloneDefaults().map((o) => {
            const ov = overrides[o.id]
            return ov ? sanitizeObject({ ...o, lat: ov.lat, lng: ov.lng }, { dropTaskLinks: true }) : o
          })
          persistMapObjects(migrated)
          localStorage.removeItem(key)
          return migrated
        }
        const overrides = JSON.parse(legacy) as Record<string, MapObject>
        const migrated = cloneDefaults().map((o) => {
          const ov = overrides[o.id]
          return ov ? sanitizeObject(ov, { dropTaskLinks: true }) : o
        })
        persistMapObjects(migrated)
        localStorage.removeItem(key)
        return migrated
      }
      return cloneDefaults()
    }

    const overrides = JSON.parse(raw) as Record<string, MapObject>
    return cloneDefaults().map((o) => {
      const ov = overrides[o.id]
      return ov ? sanitizeObject(ov) : o
    })
  } catch {
    return cloneDefaults()
  }
}

/** Сохранить полный снимок изменённых объектов */
export function persistMapObjects(objects: MapObject[]) {
  if (typeof window === 'undefined') return

  const overrides: Record<string, MapObject> = {}
  for (const o of objects) {
    const clean = sanitizeObject(o)
    const base = defaults.find((d) => d.id === clean.id)
    if (!base || JSON.stringify(sanitizeObject(base)) !== JSON.stringify(clean)) {
      overrides[clean.id] = clean
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

/** Обновить один объект в хранилище */
export function upsertMapObject(object: MapObject): MapObject[] {
  const all = loadMapObjects()
  const clean = sanitizeObject(object)
  const next = all.map((o) => (o.id === clean.id ? clean : o))
  if (!next.some((o) => o.id === clean.id)) next.push(clean)
  persistMapObjects(next)
  return next
}

/** @deprecated используйте persistMapObjects */
export function saveMapObjectCoords(objects: MapObject[]) {
  persistMapObjects(objects)
}

export function resetMapObjectCoords() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  for (const key of LEGACY_KEYS) localStorage.removeItem(key)
}
