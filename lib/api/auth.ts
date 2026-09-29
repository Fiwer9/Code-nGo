import { apiRequest, clearSession, saveSession } from './client'
import type { LoginRequest, TokenResponse, User, UserCreate } from './types'

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: payload
  })
  saveSession(data.access_token, data.expires_in, JSON.stringify(data.user))
  return data
}

export async function register(payload: UserCreate): Promise<User> {
  return apiRequest<User>('/api/v1/auth/register', {
    method: 'POST',
    body: payload
  })
}

export async function fetchMe(): Promise<User> {
  return apiRequest<User>('/api/v1/auth/me', { auth: true })
}

export function logout() {
  clearSession()
}
