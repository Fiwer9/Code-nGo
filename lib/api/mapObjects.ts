import type { MapObject } from '@/lib/mockData'

/**
 * Обновление объекта коллектора.
 * Пока заглушка: имитирует POST/PATCH в API/БД.
 * Позже: fetch(`${API}/objects/${id}`, { method: 'PATCH', body: ... })
 */
export async function updateMapObject(object: MapObject): Promise<MapObject> {
  const base = process.env.NEXT_PUBLIC_API_URL

  if (base) {
    const res = await fetch(`${base}/objects/${encodeURIComponent(object.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(object)
    })
    if (!res.ok) {
      throw new Error(`Не удалось сохранить объект (${res.status})`)
    }
    return (await res.json()) as MapObject
  }

  // Нет API — имитация сетевого запроса
  await new Promise((r) => setTimeout(r, 450))
  if (process.env.NODE_ENV === 'development') {
    console.info('[stub] updateMapObject → БД', object.id, object)
  }
  return object
}
