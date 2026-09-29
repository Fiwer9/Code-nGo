/** Типы API мониторинга (equipment / incidents / predictions) */

export type Pagination = {
  limit: number
  offset: number
  total: number
}

export type EquipmentStats = {
  total: number
  online: number
  warning: number
  offline: number
  maintenance: number
}

export type EquipmentItem = {
  id: string
  name: string
  location: string
  type: string
  sensor_type: string
  system_type: string
  status: string
  lastCheck?: string | null
  objectId?: number | null
  parentId?: number | null
}

export type EquipmentResponse = {
  items: EquipmentItem[]
  stats: EquipmentStats
  pagination: Pagination
}

export type IncidentItem = {
  id: string
  object: string
  objectId: number
  parentId?: number | null
  type: string
  status: string
  probability?: number | null
  date: string
  location: string
}

export type IncidentResponse = {
  items: IncidentItem[]
  pagination: Pagination
}

/** Ответ predictions в OpenAPI без строгой схемы — нормализуем гибко */
export type PredictionItem = {
  id: string
  object?: string
  objectId?: number | null
  parentId?: number | null
  type?: string
  status?: string
  probability?: number | null
  horizon?: string | null
  model?: string | null
  verified?: boolean | null
  date?: string | null
  created_at?: string | null
  location?: string | null
  decision?: string | null
}

export type PredictionResponse = {
  items: PredictionItem[]
  pagination?: Pagination
  stats?: Record<string, number>
}

export type PredictionDecision = 'accepted' | 'rejected' | 'verified'

export type ListParams = {
  search?: string
  status?: string
  limit?: number
  offset?: number
}
