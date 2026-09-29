import { apiRequest } from './client'
import type { AssignRolesRequest, Permission, Role, RoleCreate, User, UserCreate } from './types'

export async function listRoles(): Promise<Role[]> {
  return apiRequest<Role[]>('/api/v1/roles', { auth: true })
}

export async function listPermissions(): Promise<Permission[]> {
  return apiRequest<Permission[]>('/api/v1/roles/permissions', { auth: true })
}

export async function createRole(payload: RoleCreate): Promise<Role> {
  return apiRequest<Role>('/api/v1/roles', {
    method: 'POST',
    auth: true,
    body: payload
  })
}

export async function assignRoles(userId: number, payload: AssignRolesRequest): Promise<User> {
  return apiRequest<User>(`/api/v1/roles/${userId}/assign`, {
    method: 'POST',
    auth: true,
    body: payload
  })
}

export async function createUser(payload: UserCreate): Promise<User> {
  return apiRequest<User>('/api/v1/users', {
    method: 'POST',
    auth: true,
    body: payload
  })
}
