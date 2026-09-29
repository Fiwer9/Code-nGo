import { apiRequest, getApiBase, getStoredToken } from './client'
import type {
  EquipmentItem,
  EquipmentResponse,
  EquipmentStats,
  IncidentResponse,
  ListParams,
  PredictionDecision,
  PredictionItem,
  PredictionResponse
} from './monitoringTypes'

function qs(params?: ListParams): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function statusBucket(status: string): keyof Omit<EquipmentStats, 'total'> | null {
  const s = (status || '').toLowerCase()
  if (s.includes('warn') || s.includes('внима')) return 'warning'
  if (s.includes('off') || s.includes('не в сети')) return 'offline'
  if (s.includes('maint') || s.includes('то') || s.includes('service')) return 'maintenance'
  if (s.includes('online') || s.includes('ок') || s.includes('норм') || s.includes('on')) return 'online'
  return 'online'
}

/** KPI по фактически загруженным датчикам (не доверяем stats.total с бэка) */
export function computeEquipmentStats(items: EquipmentItem[]): EquipmentStats {
  const stats: EquipmentStats = {
    total: items.length,
    online: 0,
    warning: 0,
    offline: 0,
    maintenance: 0
  }
  for (const item of items) {
    const key = statusBucket(item.status)
    if (key) stats[key] += 1
  }
  return stats
}

export async function listEquipment(params?: ListParams): Promise<EquipmentResponse> {
  return apiRequest<EquipmentResponse>(`/api/v1/equipment${qs(params)}`, { auth: true })
}

/** Все страницы оборудования; stats считаем сами по items.
 * Не гоняем пагинацию по завышенному pagination.total с бэка:
 * останавливаемся, если страница короткая / пустая / нет новых id.
 */
export async function listAllEquipment(
  params?: Omit<ListParams, 'limit' | 'offset'>
): Promise<EquipmentResponse> {
  const pageSize = 500
  const all: EquipmentItem[] = []
  const seen = new Set<string>()
  let offset = 0
  const maxPages = 8

  for (let pageNo = 0; pageNo < maxPages; pageNo++) {
    const page = await listEquipment({ ...params, limit: pageSize, offset })
    const batch = page.items || []
    if (batch.length === 0) break

    let newCount = 0
    for (const item of batch) {
      const id = String(item.id)
      if (seen.has(id)) continue
      seen.add(id)
      all.push(item)
      newCount += 1
    }

    // Конец выборки или API крутит одни и те же записи
    if (batch.length < pageSize || newCount === 0) break
    offset += pageSize
  }

  const stats = computeEquipmentStats(all)
  return {
    items: all,
    stats,
    pagination: { limit: all.length, offset: 0, total: all.length }
  }
}

export async function getEquipmentByChannel(channelId: number): Promise<unknown> {
  return apiRequest(`/api/v1/equipment/${channelId}`, { auth: true })
}

export async function listIncidents(params?: ListParams): Promise<IncidentResponse> {
  return apiRequest<IncidentResponse>(`/api/v1/incidents${qs(params)}`, { auth: true })
}

export async function exportIncidentsCsv(params?: ListParams): Promise<Blob> {
  const token = getStoredToken()
  const res = await fetch(`${getApiBase()}/api/v1/incidents/export.csv${qs(params)}`, {
    headers: {
      Accept: 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: 'no-store'
  })
  if (!res.ok) throw new Error(`Экспорт CSV: ${res.status}`)
  return res.blob()
}

function asPredictionItem(raw: unknown): PredictionItem | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const id = obj.id != null ? String(obj.id) : ''
  if (!id) return null
  return { ...obj, id } as PredictionItem
}

function normalizePredictions(data: unknown): PredictionResponse {
  if (Array.isArray(data)) {
    return { items: data.map(asPredictionItem).filter(Boolean) as PredictionItem[] }
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const rawItems = (obj.items || obj.predictions || obj.data || []) as unknown[]
    const items = Array.isArray(rawItems)
      ? (rawItems.map(asPredictionItem).filter(Boolean) as PredictionItem[])
      : []
    return {
      items,
      pagination: obj.pagination as PredictionResponse['pagination'],
      stats: obj.stats as PredictionResponse['stats']
    }
  }
  return { items: [] }
}

export async function listPredictions(params?: ListParams): Promise<PredictionResponse> {
  const raw = await apiRequest<unknown>(`/api/v1/predictions${qs(params)}`, { auth: true })
  return normalizePredictions(raw)
}

/** Все страницы прогнозов — без погони за завышенным total */
export async function listAllPredictions(
  params?: Omit<ListParams, 'limit' | 'offset'>
): Promise<PredictionResponse> {
  const pageSize = 500
  const all: PredictionItem[] = []
  const seen = new Set<string>()
  let offset = 0
  const maxPages = 8

  for (let pageNo = 0; pageNo < maxPages; pageNo++) {
    const page = await listPredictions({ ...params, limit: pageSize, offset })
    const batch = page.items || []
    if (batch.length === 0) break

    let newCount = 0
    for (const item of batch) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      all.push(item)
      newCount += 1
    }
    if (batch.length < pageSize || newCount === 0) break
    offset += pageSize
  }

  return {
    items: all,
    pagination: { limit: all.length, offset: 0, total: all.length }
  }
}

export async function decidePrediction(
  predId: string,
  decision: PredictionDecision
): Promise<unknown> {
  return apiRequest(`/api/v1/predictions/${encodeURIComponent(predId)}/decision`, {
    method: 'POST',
    auth: true,
    body: { decision }
  })
}

/** ID родительского коллектора для отображения */
export function collectorIdOfEquipment(item: EquipmentItem): string {
  const id = item.parentId ?? item.objectId
  return id != null ? String(id) : item.id
}

export function collectorIdOfIncident(item: {
  objectId: number
  object?: string
  parentId?: number | null
}): string {
  if (item.parentId != null) return String(item.parentId)
  return String(item.objectId)
}

export function collectorIdOfPrediction(item: PredictionItem): string {
  const id = item.parentId ?? item.objectId
  if (id != null) return String(id)
  if (item.object) return String(item.object)
  return '—'
}

const PREDICTION_FIELD_LABELS: Record<string, string> = {
  id: 'ID прогноза',
  object: 'Объект (имя)',
  objectId: 'objectId',
  parentId: 'Коллектор (parentId)',
  type: 'Тип',
  status: 'Статус',
  probability: 'Вероятность',
  horizon: 'Горизонт',
  model: 'ML-модель',
  verified: 'Верифицировано',
  date: 'Дата',
  created_at: 'Создан',
  location: 'Локация',
  decision: 'Решение'
}

export function formatPredictionFieldValue(key: string, value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'да' : 'нет'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if ((key === 'date' || key === 'created_at' || key.endsWith('_at')) && typeof value === 'string') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('ru-RU')
  }
  if (key === 'probability' && typeof value === 'number') return `${value}%`
  return String(value)
}

export function predictionDetailEntries(
  item: PredictionItem
): { key: string; label: string; value: string }[] {
  const preferred = Object.keys(PREDICTION_FIELD_LABELS)
  const rest = Object.keys(item).filter((k) => !preferred.includes(k))
  return [...preferred, ...rest]
    .filter((k) => item[k] !== undefined)
    .map((key) => ({
      key,
      label: PREDICTION_FIELD_LABELS[key] || key,
      value: formatPredictionFieldValue(key, item[key])
    }))
}
