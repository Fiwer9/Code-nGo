import type { MapObject } from '@/lib/mockData'
import { getApiBase } from '@/lib/api/client'

/**
 * Обновление объекта коллектора.
 * Эндпоинт объектов на бэке пока отсутствует — при наличии API_URL
 * пробуем PATCH, иначе локальная заглушка.
 */
export async function updateMapObject(object: MapObject): Promise<MapObject> {
  const base = getApiBase()
  // Пока нет /api/v1/objects — не ходим в сеть, если явно не задан прямой URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    const res = await fetch(`${base}/api/v1/objects/${encodeURIComponent(object.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(object)
    })
    if (!res.ok) {
      throw new Error(`Не удалось сохранить объект (${res.status})`)
    }
    return (await res.json()) as MapObject
  }

  await new Promise((r) => setTimeout(r, 450))
  if (process.env.NODE_ENV === 'development') {
    console.info('[stub] updateMapObject → БД', object.id, object)
  }
  return object
}
