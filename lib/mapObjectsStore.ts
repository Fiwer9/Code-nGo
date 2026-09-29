import type { MapObject } from './mockData'
import { deriveCollectorStatus } from './collectorStatus'

/** v5: база объектов с API оборудования; в LS только оверрайды (координаты, taskId, ТО) */
const STORAGE_KEY = 'moskollector-map-objects-v5'
const LEGACY_KEYS = [
  'moskollector-map-objects-v4',
  'moskollector-map-objects-v3',
  'moskollector-map-objects-v2',
  'moskollector-map-objects'
]

function sanitizeObject(o: MapObject, opts?: { dropTaskLinks?: boolean }): MapObject {
  const sensors = (o.sensors || []).map((s) => ({
    ...s,
    readings: (s.readings || []).map((r) => ({ ...r }))
  }))
  let next: MapObject = {
    ...o,
    sensors,
    taskId: opts?.dropTaskLinks ? null : o.taskId ?? null
  }

  if (next.taskId != null && !/^\d+$/.test(String(next.taskId))) {
    next = { ...next, taskId: null }
  }

  const status = deriveCollectorStatus(next.sensors)
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

function loadOverridesRaw(): Record<string, MapObject> {
  if (typeof window === 'undefined') return {}
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key)
        if (!legacy) continue
        try {
          const parsed = JSON.parse(legacy) as Record<string, MapObject> | Record<string, { lat: number; lng: number }>
          const migrated: Record<string, MapObject> = {}
          for (const [id, val] of Object.entries(parsed)) {
            if (val && typeof val === 'object' && 'id' in val) {
              migrated[id] = sanitizeObject(val as MapObject, { dropTaskLinks: key !== STORAGE_KEY })
            } else if (val && typeof val === 'object' && 'lat' in val && 'lng' in val) {
              migrated[id] = sanitizeObject({
                id,
                type: 'Коллектор',
                len: '—',
                lat: (val as { lat: number }).lat,
                lng: (val as { lng: number }).lng,
                address: id,
                description: '',
                sensors: [],
                taskId: null
              })
            }
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
          localStorage.removeItem(key)
          return migrated
        } catch {
          /* next legacy key */
        }
      }
      return {}
    }
    return JSON.parse(raw) as Record<string, MapObject>
  } catch {
    return {}
  }
}

function saveOverrides(overrides: Record<string, MapObject>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

function mergeOne(base: MapObject, ov?: MapObject): MapObject {
  if (!ov) return sanitizeObject(base)
  return sanitizeObject({
    ...base,
    lat: ov.lat ?? base.lat,
    lng: ov.lng ?? base.lng,
    address: ov.address ?? base.address,
    description: ov.description ?? base.description,
    len: ov.len ?? base.len,
    type: ov.type ?? base.type,
    taskId: ov.taskId ?? base.taskId ?? null,
    // Операционный статус (ТО) хранится в оверрайде датчиков
    sensors:
      ov.sensors && ov.sensors.length > 0
        ? ov.sensors.map((s) => ({ ...s, readings: (s.readings || []).map((r) => ({ ...r })) }))
        : base.sensors
  })
}

/**
 * Наложить локальные правки (координаты, заявка, ТО) на базу с API.
 */
export function applyMapOverrides(base: MapObject[]): MapObject[] {
  const overrides = loadOverridesRaw()
  return base.map((o) => mergeOne(o, overrides[o.id]))
}

/**
 * Загрузить объекты. Если передан base (с API) — мержим оверрайды.
 * Без base — только сохранённые оверрайды (для связи заявок).
 */
export function loadMapObjects(base?: MapObject[]): MapObject[] {
  if (base && base.length > 0) return applyMapOverrides(base)
  const overrides = loadOverridesRaw()
  return Object.values(overrides).map((o) => sanitizeObject(o))
}

/** Сохранить снимок изменённых объектов поверх base (если base не передан — пишем все) */
export function persistMapObjects(objects: MapObject[], base?: MapObject[]) {
  if (typeof window === 'undefined') return
  const existing = loadOverridesRaw()
  const next = { ...existing }

  for (const o of objects) {
    const clean = sanitizeObject(o)
    const baseObj = base?.find((b) => b.id === clean.id)
    if (!baseObj || JSON.stringify(sanitizeObject(baseObj)) !== JSON.stringify(clean)) {
      next[clean.id] = clean
    } else {
      delete next[clean.id]
    }
  }
  saveOverrides(next)
}

/** Обновить один объект в хранилище оверрайдов */
export function upsertMapObject(object: MapObject): MapObject[] {
  const overrides = loadOverridesRaw()
  overrides[object.id] = sanitizeObject(object)
  saveOverrides(overrides)
  return Object.values(overrides).map((o) => sanitizeObject(o))
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
