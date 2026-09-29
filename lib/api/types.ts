/** Типы Moscollector API (OpenAPI 0.2.0) */

export type Gender = 'male' | 'female' | 'unspecified'

export type Permission = {
  id: number
  name: string
  description: string | null
}

export type Role = {
  id: number
  name: string
  description: string | null
  permissions: Permission[]
}

export type User = {
  id: number
  login: string
  surname: string
  name: string
  middle_name: string | null
  gender: string
  jobtitle: string
  mobile_number: string | null
  email: string
  is_active: boolean
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
  roles: Role[]
}

export type LoginRequest = {
  identifier: string
  password: string
}

export type TokenResponse = {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: User
}

export type UserCreate = {
  login: string
  password: string
  surname: string
  name: string
  middle_name?: string | null
  gender?: Gender
  jobtitle: string
  mobile_number?: string | null
  email: string
}

export type RoleCreate = {
  name: string
  description?: string | null
  permission_ids?: number[]
}

export type AssignRolesRequest = {
  role_ids: number[]
}

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}
