import { mapObjects as defaults, type MapObject } from './mockData'

const STORAGE_KEY = 'moskollector-map-objects-v2'

function cloneDefaults(): MapObject[] {
  return defaults.map((o) => ({
    ...o,
    sensors: o.sensors.map((s) => ({ ...s, readings: s.readings.map((r) => ({ ...r })) }))
  }))
}

/** Загрузить объекты: правки из localStorage поверх демо-данных */
export function loadMapObjects(): MapObject[] {
  if (typeof window === 'undefined') return cloneDefaults()

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // миграция со старого ключа только с lat/lng
      const legacy = localStorage.getItem('moskollector-map-objects')
      if (!legacy) return cloneDefaults()
      const overrides = JSON.parse(legacy) as Record<string, { lat: number; lng: number }>
      return cloneDefaults().map((o) => {
        const ov = overrides[o.id]
        return ov ? { ...o, lat: ov.lat, lng: ov.lng } : o
      })
    }

    const overrides = JSON.parse(raw) as Record<string, MapObject>
    return cloneDefaults().map((o) => {
      const ov = overrides[o.id]
      return ov ? { ...ov } : o
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
    const base = defaults.find((d) => d.id === o.id)
    if (!base || JSON.stringify(base) !== JSON.stringify(o)) {
      overrides[o.id] = o
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

/** @deprecated используйте persistMapObjects */
export function saveMapObjectCoords(objects: MapObject[]) {
  persistMapObjects(objects)
}

export function resetMapObjectCoords() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('moskollector-map-objects')
}
