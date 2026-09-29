/** Типы Ticket Service (OpenAPI 1.0.0) */

export type TicketStage =
  | 'UNPROCESSED'
  | 'PENDING_MAINT'
  | 'DIAGNOSTICS'
  | 'IN_PROGRESS'
  | 'CONTROL'
  | 'PROCESSED'

export type TicketRole = 'ADMIN' | 'MANAGER' | 'ENGINEER' | 'OBSERVER'

export type TicketAction =
  | 'ticket.create'
  | 'ticket.read'
  | 'ticket.update'
  | 'ticket.delete'
  | 'ticket.stage_change'
  | 'ticket.comment'
  | 'object.read'

export type PersonRef = {
  user_id: string
  full_name?: string
  role?: TicketRole | null
}

export type TicketDTO = {
  id: number
  title: string
  description?: string
  object_id: string
  due_date?: string | null
  warning_source?: string | null
  stage: TicketStage
  stage_title: string
  next_stages?: TicketStage[]
  author: PersonRef
  assignees?: PersonRef[]
  watchers?: PersonRef[]
  created_at: string
  updated_at: string
  closed_at?: string | null
  created_by: string
}

export type TicketCreateRequest = {
  title: string
  object_id: string
  description?: string
  due_date?: string | null
  warning_source?: string | null
  author_id?: string | null
  created_at?: string | null
  assignee_ids?: string[]
  watcher_ids?: string[]
  stage?: TicketStage
}

export type TicketUpdateRequest = {
  title?: string | null
  description?: string | null
  due_date?: string | null
  assignee_ids?: string[] | null
  watcher_ids?: string[] | null
  author_id?: string | null
  warning_source?: string | null
  comment?: string | null
}

export type StageChangeRequest = {
  stage: TicketStage
  comment?: string | null
}

export type CommentRequest = {
  text: string
}

export type TicketListResponse = {
  total: number
  page: number
  page_size: number
  pages: number
  items?: TicketDTO[]
}

export type StageInfo = {
  code: TicketStage
  title: string
  next_stages?: TicketStage[]
}

export type StageCounterDTO = {
  stage: TicketStage
  title?: string
  count: number
}

export type StageStatsResponse = {
  total: number
  by_stage?: StageCounterDTO[]
  overdue?: number
}

export type HistoryEntryDTO = {
  id: number
  ticket_id: number
  action: string
  field?: string | null
  old_value?: string | null
  new_value?: string | null
  comment?: string | null
  changed_by?: PersonRef | null
  created_at: string
}

export type UserDTO = {
  user_id: string
  full_name: string
  role: TicketRole
  position?: string | null
  email?: string | null
  is_active?: boolean
}

export type UserInfoResponse = {
  user: UserDTO
  roles?: TicketRole[]
  object_scope?: string[]
  allowed_actions?: string[]
}

export type ObjectSummaryDTO = {
  object_id: string
  title?: string | null
  tickets_total?: number
  tickets_open?: number
  tickets_overdue?: number
  last_ticket_at?: string | null
}

export type NotificationDTO = {
  id: number
  ticket_id: number
  user_id: string
  event_type: string
  message: string
  created_at: string
  is_read?: boolean
}

export type MessageResponse = {
  message: string
}

export type TicketListParams = {
  stage?: TicketStage | TicketStage[]
  object_id?: string
  author_id?: string
  assignee_id?: string
  watcher_id?: string
  only_mine?: boolean
  overdue_only?: boolean
  search?: string
  created_from?: string
  created_to?: string
  order_by?: 'created_at' | 'updated_at' | 'due_date' | 'title' | 'stage' | 'id'
  order_desc?: boolean
  page?: number
  page_size?: number
}
