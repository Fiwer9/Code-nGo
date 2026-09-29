import { apiRequest } from './client'
import type {
  CommentRequest,
  HistoryEntryDTO,
  MessageResponse,
  NotificationDTO,
  ObjectSummaryDTO,
  StageChangeRequest,
  StageInfo,
  StageStatsResponse,
  TicketCreateRequest,
  TicketDTO,
  TicketListParams,
  TicketListResponse,
  TicketUpdateRequest,
  UserDTO,
  UserInfoResponse
} from './ticketTypes'

/** База BFF: Next.js проксирует в Ticket Service с X-API-Key / X-User-Id / X-Role */
const TICKETS_BFF = '/api/ticket-service'

function ticketsUrl(path: string, params?: Record<string, unknown>, bustCache = false): string {
  const base = `${TICKETS_BFF}${path.startsWith('/') ? path : `/${path}`}`
  const qs = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === '') continue
          qs.append(key, String(item))
        }
        continue
      }
      if (typeof value === 'boolean') {
        qs.set(key, value ? 'true' : 'false')
        continue
      }
      qs.set(key, String(value))
    }
  }
  // Ticket Service кэширует списки — после create/update нужен обход TTL
  if (bustCache) qs.set('_ts', String(Date.now()))
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

function ticketRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  // path уже абсолютный относительно origin (`/api/ticket-service/...`)
  return apiRequest<T>(path, { ...options, auth: true, base: '', cache: 'no-store' })
}

export async function listTicketStages(): Promise<StageInfo[]> {
  return ticketRequest<StageInfo[]>(ticketsUrl('/api/v1/tickets/stages'))
}

export async function listTickets(
  params: TicketListParams = {},
  opts?: { fresh?: boolean }
): Promise<TicketListResponse> {
  return ticketRequest<TicketListResponse>(
    ticketsUrl('/api/v1/tickets', params as Record<string, unknown>, Boolean(opts?.fresh))
  )
}

export async function getTicketStats(
  objectId?: string,
  opts?: { fresh?: boolean }
): Promise<StageStatsResponse> {
  return ticketRequest<StageStatsResponse>(
    ticketsUrl(
      '/api/v1/tickets/stats/stages',
      objectId ? { object_id: objectId } : undefined,
      Boolean(opts?.fresh)
    )
  )
}

export async function getTicket(ticketId: number): Promise<TicketDTO> {
  return ticketRequest<TicketDTO>(ticketsUrl(`/api/v1/tickets/${ticketId}`))
}

export async function createTicket(payload: TicketCreateRequest): Promise<TicketDTO> {
  return ticketRequest<TicketDTO>(ticketsUrl('/api/v1/tickets'), {
    method: 'POST',
    body: payload
  })
}

export async function updateTicket(ticketId: number, payload: TicketUpdateRequest): Promise<TicketDTO> {
  return ticketRequest<TicketDTO>(ticketsUrl(`/api/v1/tickets/${ticketId}`), {
    method: 'PATCH',
    body: payload
  })
}

export async function deleteTicket(ticketId: number, hard = false): Promise<MessageResponse> {
  return ticketRequest<MessageResponse>(
    ticketsUrl(`/api/v1/tickets/${ticketId}`, hard ? { hard: true } : undefined),
    { method: 'DELETE' }
  )
}

export async function changeTicketStage(
  ticketId: number,
  payload: StageChangeRequest
): Promise<TicketDTO> {
  return ticketRequest<TicketDTO>(ticketsUrl(`/api/v1/tickets/${ticketId}/stage`), {
    method: 'PUT',
    body: payload
  })
}

export async function addTicketComment(
  ticketId: number,
  payload: CommentRequest
): Promise<HistoryEntryDTO> {
  return ticketRequest<HistoryEntryDTO>(ticketsUrl(`/api/v1/tickets/${ticketId}/comments`), {
    method: 'POST',
    body: payload
  })
}

export async function getTicketHistory(ticketId: number): Promise<HistoryEntryDTO[]> {
  return ticketRequest<HistoryEntryDTO[]>(ticketsUrl(`/api/v1/tickets/${ticketId}/history`))
}

export async function listTicketsByObject(
  objectId: string,
  params: Omit<TicketListParams, 'object_id'> = {}
): Promise<TicketListResponse> {
  return ticketRequest<TicketListResponse>(
    ticketsUrl(`/api/v1/tickets/by-object/${encodeURIComponent(objectId)}`, params as Record<string, unknown>)
  )
}

export async function listTicketObjects(): Promise<ObjectSummaryDTO[]> {
  return ticketRequest<ObjectSummaryDTO[]>(ticketsUrl('/api/v1/objects'))
}

export async function listAllowedObjects(): Promise<string[]> {
  const data = await ticketRequest<unknown>(ticketsUrl('/api/v1/objects/allowed'))
  if (Array.isArray(data)) return data.map(String)
  if (data && typeof data === 'object' && 'objects' in data && Array.isArray((data as { objects: unknown }).objects)) {
    return (data as { objects: unknown[] }).objects.map(String)
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: unknown[] }).items.map(String)
  }
  return []
}

export async function getTicketUserMe(): Promise<UserInfoResponse> {
  return ticketRequest<UserInfoResponse>(ticketsUrl('/api/v1/users/me'))
}

export async function listTicketUsers(role?: string): Promise<UserDTO[]> {
  return ticketRequest<UserDTO[]>(
    ticketsUrl('/api/v1/users', role ? { role } : undefined)
  )
}

export async function listMyNotifications(params?: {
  user_id?: string
  ticket_id?: number
  limit?: number
}): Promise<NotificationDTO[]> {
  return ticketRequest<NotificationDTO[]>(
    ticketsUrl('/api/v1/notifications', params as Record<string, unknown>)
  )
}

export async function listTicketNotifications(
  ticketId: number,
  limit = 100
): Promise<NotificationDTO[]> {
  return ticketRequest<NotificationDTO[]>(
    ticketsUrl(`/api/v1/tickets/${ticketId}/notifications`, { limit })
  )
}
