import type { User } from '@/lib/api/types'
import type { TicketAction, TicketRole } from '@/lib/api/ticketTypes'
import { canAccessAdmin, hasPermission, userPermissions } from '@/lib/permissions'
import {
  isAdminRoleName,
  isCityDispatcherRoleName,
  isDistrictDispatcherRoleName,
  isTechnicianRoleName
} from '@/lib/roles'

const ROLE_PRIORITY: TicketRole[] = ['ADMIN', 'MANAGER', 'ENGINEER', 'OBSERVER']

/** Действия по умолчанию для роли Ticket Service (если /users/me ещё не загружен) */
export const TICKET_ROLE_ACTIONS: Record<TicketRole, readonly TicketAction[]> = {
  ADMIN: [
    'ticket.create',
    'ticket.read',
    'ticket.update',
    'ticket.delete',
    'ticket.stage_change',
    'ticket.comment',
    'object.read'
  ],
  MANAGER: [
    'ticket.create',
    'ticket.read',
    'ticket.update',
    'ticket.stage_change',
    'ticket.comment',
    'object.read'
  ],
  ENGINEER: ['ticket.read', 'ticket.stage_change', 'ticket.comment', 'object.read'],
  OBSERVER: ['ticket.read', 'object.read']
}

const STAGE_LABELS: Record<string, string> = {
  UNPROCESSED: 'Не обработана',
  PENDING_MAINT: 'Ожидает ТО',
  DIAGNOSTICS: 'Диагностика',
  IN_PROGRESS: 'В работе',
  CONTROL: 'Контроль',
  PROCESSED: 'Обработана'
}

export function ticketStageLabel(code: string): string {
  return STAGE_LABELS[code] || code
}

export function ticketRoleLabel(role: TicketRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Администратор'
    case 'MANAGER':
      return 'Городской диспетчер'
    case 'ENGINEER':
      return 'Техник'
    case 'OBSERVER':
      return 'Наблюдатель'
    default:
      return role
  }
}

/**
 * Подсказка роли для заголовка X-Role Ticket Service.
 * Источник истины — модуль прав доступа на бэке; здесь только маппинг
 * ролей/прав сервера авторизации → ADMIN | MANAGER | ENGINEER | OBSERVER.
 */
export function resolveTicketRole(user: User | null | undefined): TicketRole {
  if (!user) return 'OBSERVER'

  const names = (user.roles || []).map((r) => r.name || '')
  const perms = userPermissions(user)

  // Городской диспетчер и админ — полные права по заявкам
  if (names.some(isCityDispatcherRoleName) || names.some(isAdminRoleName) || canAccessAdmin(user)) {
    return 'ADMIN'
  }
  if (perms.has('ticket.delete') || perms.has('roles:manage')) return 'ADMIN'

  // Техник — работа по назначенным заявкам (стадия/комментарий)
  if (names.some(isTechnicianRoleName)) return 'ENGINEER'

  const lower = names.map((n) => n.toLowerCase())
  const hasName = (...needles: string[]) =>
    lower.some((n) => needles.some((needle) => n.includes(needle)))

  if (
    hasName('manager', 'менеджер', 'диспетчер') &&
    !names.some(isDistrictDispatcherRoleName)
  ) {
    return 'MANAGER'
  }
  if (perms.has('ticket.create') || perms.has('ticket.update')) return 'MANAGER'

  if (hasName('engineer', 'инженер', 'техник')) return 'ENGINEER'
  if (perms.has('ticket.stage_change') && !perms.has('ticket.create')) return 'ENGINEER'

  if (hasName('observer', 'наблюд', 'аналитик', 'analyst')) return 'OBSERVER'

  for (const role of ROLE_PRIORITY) {
    if (lower.some((n) => n === role.toLowerCase())) return role
  }

  return 'OBSERVER'
}

/** ID субъекта для X-User-Id: логин из сервера авторизации (с опциональным маппингом). */
export function resolveTicketUserId(user: User | null | undefined): string | null {
  if (!user) return null
  const login = user.login?.trim()
  const raw = login || String(user.id)
  return mapTicketUserId(raw)
}

/**
 * Маппинг login auth → user_id модуля прав Ticket Service.
 * Формат env TICKETS_USER_ID_MAP: `admin:admin_sidorov,ivanov:manager_ivanov`
 *
 * Зачем: auth и модуль ACCESS_CONTROL Ticket Service пока живут разными
 * справочниками пользователей. X-Role — только подсказка; права берёт AC по user_id.
 */
export function mapTicketUserId(authUserId: string): string {
  const map = parseUserIdMap()
  return map[authUserId] || map[authUserId.toLowerCase()] || authUserId
}

function parseUserIdMap(): Record<string, string> {
  // Дефолт для локальной связки с демо-справочником Ticket Service
  const defaults: Record<string, string> = {
    admin: 'admin_sidorov'
  }
  const raw =
    (typeof process !== 'undefined' && process.env?.TICKETS_USER_ID_MAP?.trim()) || ''
  if (!raw) return defaults
  const out = { ...defaults }
  for (const part of raw.split(',')) {
    const [from, to] = part.split(':').map((s) => s.trim())
    if (from && to) {
      out[from] = to
      out[from.toLowerCase()] = to
    }
  }
  return out
}

export function defaultActionsForRole(role: TicketRole): Set<string> {
  return new Set(TICKET_ROLE_ACTIONS[role])
}

export function canTicketAction(
  actions: Set<string> | Iterable<string> | null | undefined,
  action: TicketAction,
  fallbackRole?: TicketRole
): boolean {
  const set =
    actions instanceof Set
      ? actions
      : actions
        ? new Set(actions)
        : fallbackRole
          ? defaultActionsForRole(fallbackRole)
          : new Set<string>()
  // ACCESS_CONTROL часто отдаёт ["*"] для ADMIN
  if (set.has('*')) return true
  return set.has(action)
}

/** Клиентская эвристика по ролям auth (до ответа Ticket /users/me) */
export function ticketActionsFromAuthUser(user: User | null | undefined): Set<string> {
  if (!user) return new Set()
  const role = resolveTicketRole(user)
  const fromRole = defaultActionsForRole(role)
  const perms = userPermissions(user)
  for (const p of perms) {
    if (p.startsWith('ticket.') || p === 'object.read') fromRole.add(p)
  }
  // Совместимость с правами auth-сервиса без префикса ticket.
  if (hasPermission(user, 'users:manage_roles') || canAccessAdmin(user)) {
    for (const a of TICKET_ROLE_ACTIONS.ADMIN) fromRole.add(a)
  }
  return fromRole
}
