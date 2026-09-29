import type { User } from '@/lib/api/types'
import { isAdminRoleName, isCityDispatcher } from '@/lib/roles'

/** Права, достаточные для доступа к разделу «Администратор» */
const ADMIN_PERMISSIONS = [
  'users:create',
  'users:read',
  'users:manage_roles',
  'roles:read',
  'roles:manage'
] as const

export function userPermissions(user: User | null | undefined): Set<string> {
  const set = new Set<string>()
  if (!user?.roles) return set
  for (const role of user.roles) {
    for (const p of role.permissions || []) {
      if (p?.name) set.add(p.name)
    }
  }
  return set
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return userPermissions(user).has(permission)
}

export function hasAnyPermission(
  user: User | null | undefined,
  permissions: readonly string[]
): boolean {
  const set = userPermissions(user)
  return permissions.some((p) => set.has(p))
}

/** Есть ли доступ к админ-панели (пользователи, роли, интеграции) */
export function canAccessAdmin(user: User | null | undefined): boolean {
  if (!user) return false
  // Городской диспетчер — права как у администратора
  if (isCityDispatcher(user)) return true
  if (user.roles?.some((r) => isAdminRoleName(r.name))) return true
  return hasAnyPermission(user, ADMIN_PERMISSIONS)
}
