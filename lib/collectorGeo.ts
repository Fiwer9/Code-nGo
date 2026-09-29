/**
 * Стабильные «случайные» координаты и адрес коллектора по parentId
 * (в API координат нет — генерируем детерминированно в пределах Москвы).
 */

const STREETS = [
  'ул. Тверская',
  'Ленинский пр-т',
  'ш. Энтузиастов',
  'ул. Профсоюзная',
  'Кутузовский пр-т',
  'ул. Вавилова',
  'Варшавское ш.',
  'ул. Новый Арбат',
  'пр-т Мира',
  'ул. Большая Якиманка',
  'Нагатинская ул.',
  'ул. Люсиновская',
  'Рязанский пр-т',
  'ул. Академика Королёва',
  'Каширское ш.'
]

function hashId(id: string | number): number {
  const s = String(id)
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type CollectorGeo = {
  lat: number
  lng: number
  address: string
}

/** Москва: примерно 55.58–55.92 N, 37.36–37.86 E */
export function collectorGeo(parentId: string | number): CollectorGeo {
  const h = hashId(parentId)
  const lat = 55.58 + ((h % 10000) / 10000) * 0.34
  const lng = 37.36 + (((h >>> 14) % 10000) / 10000) * 0.5
  const street = STREETS[h % STREETS.length]
  const house = (h % 118) + 1
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    address: `${street}, д. ${house}`
  }
}
