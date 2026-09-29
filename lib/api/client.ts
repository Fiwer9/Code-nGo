import { ApiError } from './types'

const TOKEN_KEY = 'moskollector-access-token'
const TOKEN_EXPIRES_KEY = 'moskollector-token-expires-at'
const USER_KEY = 'moskollector-user'

/**
 * Базовый URL API.
 * По умолчанию — прокси Next.js (`/backend`), чтобы обойти CORS.
 * Можно переопределить через NEXT_PUBLIC_API_URL.
 */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return '/backend'
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_KEY) || 0)
  if (expiresAt && Date.now() >= expiresAt) {
    clearSession()
    return null
  }
  return token
}

export function getStoredUserJson(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_KEY)
}

export function saveSession(accessToken: string, expiresIn: number, userJson: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, accessToken)
  // небольшой запас, чтобы не слать просроченный токен
  localStorage.setItem(TOKEN_EXPIRES_KEY, String(Date.now() + Math.max(0, expiresIn - 30) * 1000))
  localStorage.setItem(USER_KEY, userJson)
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRES_KEY)
  localStorage.removeItem(USER_KEY)
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  auth?: boolean
}

function formatDetail(detail: unknown): string {
  if (!detail) return 'Ошибка запроса'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg)
        }
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object' && detail !== null && 'detail' in detail) {
    return formatDetail((detail as { detail: unknown }).detail)
  }
  return 'Ошибка запроса'
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = false, headers, ...rest } = options
  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`

  const finalHeaders: HeadersInit = {
    Accept: 'application/json',
    ...(headers || {})
  }

  if (body !== undefined) {
    ;(finalHeaders as Record<string, string>)['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getStoredToken()
    if (!token) {
      throw new ApiError(401, 'Требуется авторизация')
    }
    ;(finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearSession()
    }
    const detail =
      data && typeof data === 'object' && data !== null && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data
    throw new ApiError(res.status, formatDetail(detail), detail)
  }

  return data as T
}
