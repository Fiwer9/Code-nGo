import { apiRequest, getApiBase, getStoredToken } from './client'
import type {
  EquipmentItem,
  EquipmentResponse,
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

export async function listEquipment(params?: ListParams): Promise<EquipmentResponse> {
  return apiRequest<EquipmentResponse>(`/api/v1/equipment${qs(params)}`, { auth: true })
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

function normalizePredictions(data: unknown): PredictionResponse {
  if (Array.isArray(data)) {
    return { items: data as PredictionItem[] }
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const items = (obj.items || obj.predictions || obj.data || []) as PredictionItem[]
    return {
      items: Array.isArray(items) ? items : [],
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
  if (item.object) return item.object
  return '—'
}
