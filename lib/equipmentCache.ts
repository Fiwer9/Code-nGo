import type { EquipmentItem, EquipmentResponse } from '@/lib/api/monitoringTypes'
import { computeEquipmentStats, listAllEquipment } from '@/lib/api/monitoring'

const STORAGE_KEY = 'moskollector-equipment-cache-v1'
/** Список датчиков (структура) живёт долго — меняется редко */
const STRUCTURE_TTL_MS = 30 * 60 * 1000
/** Статусы считаем «свежими» короткое время; дальше — фоновое обновление */
const FRESH_TTL_MS = 60 * 1000

type EquipmentCacheEntry = {
  items: EquipmentItem[]
  fetchedAt: number
}

let memory: EquipmentCacheEntry | null = null
let inflight: Promise<EquipmentResponse> | null = null

function toResponse(items: EquipmentItem[]): EquipmentResponse {
  const stats = computeEquipmentStats(items)
  return {
    items,
    stats,
    pagination: { limit: items.length, offset: 0, total: items.length }
  }
}

function readStorage(): EquipmentCacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EquipmentCacheEntry
    if (!parsed?.items || !Array.isArray(parsed.items) || !parsed.fetchedAt) return null
    if (Date.now() - parsed.fetchedAt > STRUCTURE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(items: EquipmentItem[]) {
  const entry: EquipmentCacheEntry = { items, fetchedAt: Date.now() }
  memory = entry
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    /* quota — оставляем только memory */
  }
}

/** Синхронный peek для мгновенного первого рендера */
export function peekEquipmentCache(): EquipmentResponse | null {
  if (memory && Date.now() - memory.fetchedAt <= STRUCTURE_TTL_MS) {
    return toResponse(memory.items)
  }
  const stored = readStorage()
  if (stored) {
    memory = stored
    return toResponse(stored.items)
  }
  return null
}

export function invalidateEquipmentCache() {
  memory = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * Обновить статусы/поля датчиков поверх кеша структуры.
 * Если с сети пришёл тот же набор id — мержим status/lastCheck; иначе заменяем список.
 */
function mergeEquipmentStatus(
  prev: EquipmentItem[],
  next: EquipmentItem[]
): EquipmentItem[] {
  if (prev.length === 0) return next
  const prevById = new Map(prev.map((i) => [i.id, i]))
  const nextIds = new Set(next.map((i) => i.id))

  // Набор датчиков сильно изменился — берём сеть как истину
  if (prev.length !== next.length || next.some((i) => !prevById.has(i.id))) {
    return next
  }

  return next.map((n) => {
    const old = prevById.get(n.id)
    if (!old) return n
    return {
      ...old,
      status: n.status,
      lastCheck: n.lastCheck,
      location: n.location || old.location,
      name: n.name || old.name,
      type: n.type || old.type,
      sensor_type: n.sensor_type || old.sensor_type,
      system_type: n.system_type || old.system_type,
      objectId: n.objectId ?? old.objectId,
      parentId: n.parentId ?? old.parentId
    }
  })
}

async function fetchAndCache(): Promise<EquipmentResponse> {
  if (inflight) return inflight

  inflight = (async () => {
    const prev = memory?.items || readStorage()?.items || []
    const fresh = await listAllEquipment()
    const merged = mergeEquipmentStatus(prev, fresh.items || [])
    writeCache(merged)
    return toResponse(merged)
  })().finally(() => {
    inflight = null
  })

  return inflight
}

export type GetEquipmentCachedOptions = {
  /** Игнорировать кеш, ждать сеть */
  force?: boolean
  /** Поиск — без общего кеша */
  search?: string
  /** Вызов после фонового обновления (SWR) */
  onUpdate?: (data: EquipmentResponse) => void
}

/**
 * Кеш оборудования + stale-while-revalidate.
 * Быстрый путь: сразу отдаём localStorage/memory, статусы догружаем в фоне.
 */
export async function getEquipmentCached(
  options: GetEquipmentCachedOptions = {}
): Promise<EquipmentResponse & { fromCache: boolean }> {
  const search = options.search?.trim() || ''
  if (search) {
    const data = await listAllEquipment({ search })
    return { ...data, fromCache: false }
  }

  if (options.force) {
    const data = await fetchAndCache()
    options.onUpdate?.(data)
    return { ...data, fromCache: false }
  }

  const cached = peekEquipmentCache()
  if (cached) {
    const age = memory ? Date.now() - memory.fetchedAt : FRESH_TTL_MS + 1
    if (age > FRESH_TTL_MS) {
      void fetchAndCache()
        .then((data) => options.onUpdate?.(data))
        .catch(() => {})
    }
    return { ...cached, fromCache: true }
  }

  const data = await fetchAndCache()
  options.onUpdate?.(data)
  return { ...data, fromCache: false }
}
