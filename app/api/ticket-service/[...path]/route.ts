import { loadEnvConfig } from '@next/env'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@/lib/api/types'
import { resolveTicketRole, resolveTicketUserId } from '@/lib/ticketAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Подхватываем .env.local на каждый запрос (dev / hot-reload) */
function env(name: string): string {
  loadEnvConfig(process.cwd())
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
])

function ticketsOrigin(): string {
  const raw = env('TICKETS_API_URL') || 'http://139.100.207.246:8081'
  return raw.replace(/\/$/, '')
}

function authOrigin(): string {
  const raw = env('API_PROXY_TARGET') || 'http://31.76.44.247:8000'
  return raw.replace(/\/$/, '')
}

async function resolveCaller(req: NextRequest): Promise<User | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.toLowerCase().startsWith('bearer ')) return null
  try {
    const res = await fetch(`${authOrigin()}/api/v1/auth/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: auth
      },
      cache: 'no-store'
    })
    if (!res.ok) return null
    return (await res.json()) as User
  } catch {
    return null
  }
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const apiKey = env('TICKETS_API_KEY')
  if (!apiKey) {
    return NextResponse.json(
      {
        detail:
          'TICKETS_API_KEY не задан на сервере Next.js. Добавьте ключ в .env.local (см. .env.example) и перезапустите npm run dev.'
      },
      { status: 503 }
    )
  }

  const user = await resolveCaller(req)
  if (!user) {
    return NextResponse.json({ detail: 'Требуется авторизация' }, { status: 401 })
  }

  const userId = resolveTicketUserId(user)
  if (!userId) {
    return NextResponse.json({ detail: 'Не удалось определить пользователя' }, { status: 401 })
  }

  const role = resolveTicketRole(user)
  const targetPath = pathParts.map(encodeURIComponent).join('/')
  const url = new URL(`${ticketsOrigin()}/${targetPath}`)
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  const headers = new Headers()
  headers.set('Accept', req.headers.get('accept') || 'application/json')
  headers.set('X-API-Key', apiKey)
  headers.set('X-User-Id', userId)
  headers.set('X-Role', role)

  const requestId = req.headers.get('x-request-id')
  if (requestId) headers.set('X-Request-Id', requestId)

  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)

  const method = req.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? await req.arrayBuffer() : undefined

  let upstream: Response
  try {
    upstream = await fetch(url.toString(), {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store'
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ticket Service недоступен'
    return NextResponse.json({ detail: message }, { status: 503 })
  }

  const outHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return
    if (key.toLowerCase() === 'content-encoding') return
    outHeaders.set(key, value)
  })

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: outHeaders
  })
}

type Ctx = { params: { path?: string[] } }

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path || [])
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path || [])
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path || [])
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path || [])
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path || [])
}
