import type { Role, User } from '@/lib/api/types'

/** Канонические русские названия ролей (для UI) */
export const ROLE_RU = {
  admin: 'Администратор',
  cityDispatcher: 'Городской диспетчер',
  districtDispatcher: 'Диспетчер района',
  technician: 'Техник',
  engineer: 'Инженер',
  analyst: 'Аналитик',
  observer: 'Наблюдатель',
  manager: 'Городской диспетчер'
} as const

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Роль администратора (скрываем в админ-панели) */
export function isAdminRoleName(name: string): boolean {
  const n = norm(name)
  return (
    n === 'admin' ||
    n === 'administrator' ||
    n.includes('администратор') ||
    /^admin\b/.test(n)
  )
}

/** Диспетчер района — убираем из UI */
export function isDistrictDispatcherRoleName(name: string): boolean {
  const n = norm(name)
  return (
    n.includes('диспетчер района') ||
    n.includes('районный диспетчер') ||
    n.includes('district') ||
    (n.includes('диспетчер') && n.includes('район'))
  )
}

/** Городской диспетчер — права как у администратора */
export function isCityDispatcherRoleName(name: string): boolean {
  const n = norm(name)
  if (isDistrictDispatcherRoleName(name)) return false
  return (
    n.includes('городской диспетчер') ||
    n.includes('city dispatcher') ||
    n === 'manager' ||
    n === 'dispatcher' ||
    (n.includes('диспетчер') && n.includes('город'))
  )
}

/** Техник — только заявки */
export function isTechnicianRoleName(name: string): boolean {
  const n = norm(name)
  return n === 'техник' || n.includes('техник') || n === 'technician' || n.includes('technician')
}

export function userHasRole(
  user: User | null | undefined,
  predicate: (name: string) => boolean
): boolean {
  return Boolean(user?.roles?.some((r) => predicate(r.name || '')))
}

export function isCityDispatcher(user: User | null | undefined): boolean {
  return userHasRole(user, isCityDispatcherRoleName)
}

export function isTechnician(user: User | null | undefined): boolean {
  return userHasRole(user, isTechnicianRoleName)
}

/**
 * Русское отображаемое имя роли.
 * Не показываем английский код + русское описание снизу — одно название.
 */
export function roleDisplayName(role: Pick<Role, 'name'> & { description?: string | null }): string {
  const name = role.name || ''
  const n = norm(name)

  if (isAdminRoleName(name)) return ROLE_RU.admin
  if (isCityDispatcherRoleName(name)) return ROLE_RU.cityDispatcher
  if (isDistrictDispatcherRoleName(name)) return ROLE_RU.districtDispatcher
  if (isTechnicianRoleName(name)) return ROLE_RU.technician

  if (n === 'engineer' || n.includes('engineer') || n.includes('инженер')) return ROLE_RU.engineer
  if (n === 'analyst' || n.includes('analyst') || n.includes('аналитик')) return ROLE_RU.analyst
  if (n === 'observer' || n.includes('observer') || n.includes('наблюд')) return ROLE_RU.observer
  if (n === 'manager' || n.includes('manager') || n.includes('менеджер')) return ROLE_RU.manager

  // Уже по-русски
  if (/[а-яё]/i.test(name)) return name.trim()

  // Английский код без маппинга — берём короткое русское description, если есть
  const desc = (role.description || '').trim()
  if (desc && /[а-яё]/i.test(desc)) {
    const short = desc.split(/[.\n]/)[0].trim()
    if (short.length > 0 && short.length <= 64) return short
  }

  return name
}

/** Роли, которые можно выбирать/показывать в админ-панели */
export function rolesForAdminPanel(roles: Role[]): Role[] {
  return roles.filter(
    (r) => !isAdminRoleName(r.name) && !isDistrictDispatcherRoleName(r.name)
  )
}

export function userRolesLabel(user: User | null | undefined): string {
  if (!user?.roles?.length) return 'Пользователь'
  return user.roles.map((r) => roleDisplayName(r)).join(', ')
}

/** Маршруты, доступные технику (только заявки) */
export const TECHNICIAN_PATHS = ['/requests', '/login'] as const

export function canTechnicianAccessPath(pathname: string): boolean {
  if (pathname === '/requests' || pathname.startsWith('/requests/')) return true
  if (pathname === '/login') return true
  return false
}
