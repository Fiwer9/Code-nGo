import { mapObjects as defaults, type MapObject } from './mockData'

const STORAGE_KEY = 'moskollector-map-objects'

/** Загрузить объекты: правки координат из localStorage поверх демо-данных */
export function loadMapObjects(): MapObject[] {
  if (typeof window === 'undefined') return defaults.map((o) => ({ ...o }))

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults.map((o) => ({ ...o }))

    const overrides = JSON.parse(raw) as Record<string, { lat: number; lng: number }>
    return defaults.map((o) => {
      const ov = overrides[o.id]
      return ov ? { ...o, lat: ov.lat, lng: ov.lng } : { ...o }
    })
  } catch {
    return defaults.map((o) => ({ ...o }))
  }
}

/** Сохранить только изменённые lat/lng */
export function saveMapObjectCoords(objects: MapObject[]) {
  if (typeof window === 'undefined') return

  const overrides: Record<string, { lat: number; lng: number }> = {}
  for (const o of objects) {
    const base = defaults.find((d) => d.id === o.id)
    if (!base || base.lat !== o.lat || base.lng !== o.lng) {
      overrides[o.id] = { lat: o.lat, lng: o.lng }
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function resetMapObjectCoords() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
