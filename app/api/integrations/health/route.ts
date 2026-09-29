import { loadEnvConfig } from '@next/env'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function env(name: string): string {
  loadEnvConfig(process.cwd())
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

function authOrigin(): string {
  return (env('API_PROXY_TARGET') || 'http://31.76.44.247:8000').replace(/\/$/, '')
}

function ticketsOrigin(): string {
  return (env('TICKETS_API_URL') || 'http://139.100.207.246:8081').replace(/\/$/, '')
}

export type IntegrationHealthStatus = 'ok' | 'degraded' | 'down'

export type IntegrationModule = {
  id: string
  name: string
  type: string
  description: string
  endpoint: string
  status: IntegrationHealthStatus
  latencyMs: number | null
  checkedAt: string
  details: Record<string, string>
  error?: string
}

async function probeHealth(
  url: string,
  timeoutMs = 8000
): Promise<{
  ok: boolean
  statusCode: number
  latencyMs: number
  body: Record<string, unknown> | null
  error?: string
}> {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    })
    const latencyMs = Date.now() - started
    const text = await res.text()
    let body: Record<string, unknown> | null = null
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : null
    } catch {
      body = text ? { raw: text.slice(0, 200) } : null
    }
    return { ok: res.ok, statusCode: res.status, latencyMs, body }
  } catch (e) {
    return {
      ok: false,
      statusCode: 0,
      latencyMs: Date.now() - started,
      body: null,
      error: e instanceof Error ? e.message : 'Ошибка сети'
    }
  }
}

function asStr(v: unknown): string {
  if (v == null) return '—'
  return String(v)
}

function normalizeOverall(status: unknown, database: unknown): IntegrationHealthStatus {
  const s = String(status || '').toLowerCase()
  const db = String(database || '').toLowerCase()
  if (s === 'ok' || s === 'up' || s === 'healthy') {
    if (db && db !== 'ok' && db !== 'up' && db !== 'healthy') return 'degraded'
    return 'ok'
  }
  if (s === 'degraded') return 'degraded'
  return 'down'
}

export async function GET() {
  const checkedAt = new Date().toISOString()
  const mosUrl = `${authOrigin()}/health`
  const ticketsUrl = `${ticketsOrigin()}/health`

  const [mos, tickets] = await Promise.all([probeHealth(mosUrl), probeHealth(ticketsUrl)])

  const modules: IntegrationModule[] = [
    {
      id: 'moscollector-api',
      name: 'Moscollector API',
      type: 'Monitoring / Auth',
      description: 'Авторизация, оборудование, инциденты, прогнозы',
      endpoint: '/health',
      status: mos.ok
        ? normalizeOverall(mos.body?.status, mos.body?.database)
        : 'down',
      latencyMs: mos.latencyMs,
      checkedAt,
      details: {
        HTTP: mos.statusCode ? String(mos.statusCode) : '—',
        status: asStr(mos.body?.status),
        database: asStr(mos.body?.database),
        URL: authOrigin()
      },
      error: mos.error
    },
    {
      id: 'ticket-service',
      name: 'Ticket Service',
      type: 'Заявки',
      description: 'Журнал заявок, стадии, исполнители, уведомления',
      endpoint: '/health',
      status: tickets.ok
        ? normalizeOverall(tickets.body?.status, tickets.body?.database)
        : 'down',
      latencyMs: tickets.latencyMs,
      checkedAt,
      details: {
        HTTP: tickets.statusCode ? String(tickets.statusCode) : '—',
        status: asStr(tickets.body?.status),
        service: asStr(tickets.body?.service),
        version: asStr(tickets.body?.version),
        database: asStr(tickets.body?.database),
        access_control: asStr(tickets.body?.access_control),
        mode: asStr(tickets.body?.mode),
        cache: asStr(tickets.body?.cache),
        notifications: asStr(tickets.body?.notifications),
        URL: ticketsOrigin()
      },
      error: tickets.error
    },
    {
      id: 'yandex-maps',
      name: 'Яндекс.Карты',
      type: 'Frontend',
      description: 'Ключ JavaScript API для карты объектов',
      endpoint: 'NEXT_PUBLIC_YANDEX_MAPS_KEY',
      status: env('NEXT_PUBLIC_YANDEX_MAPS_KEY') ? 'ok' : 'down',
      latencyMs: null,
      checkedAt,
      details: {
        key: env('NEXT_PUBLIC_YANDEX_MAPS_KEY') ? 'задан' : 'не задан'
      },
      error: env('NEXT_PUBLIC_YANDEX_MAPS_KEY') ? undefined : 'Ключ не найден в .env.local'
    }
  ]

  // Подмодули БД / access_control как отдельные карточки для наглядности
  if (mos.ok && mos.body) {
    modules.push({
      id: 'moscollector-db',
      name: 'Moscollector · БД',
      type: 'PostgreSQL',
      description: 'Состояние database из /health Moscollector API',
      endpoint: '/health → database',
      status:
        String(mos.body.database || '').toLowerCase() === 'ok' ||
        String(mos.body.database || '').toLowerCase() === 'up'
          ? 'ok'
          : 'down',
      latencyMs: mos.latencyMs,
      checkedAt,
      details: { database: asStr(mos.body.database) }
    })
  }

  if (tickets.ok && tickets.body) {
    const ac = String(tickets.body.access_control || '').toLowerCase()
    modules.push({
      id: 'ticket-access-control',
      name: 'Ticket · Access Control',
      type: 'Права',
      description: 'Модуль прав доступа Ticket Service',
      endpoint: '/health → access_control',
      status: ac === 'up' || ac === 'ok' ? 'ok' : 'degraded',
      latencyMs: tickets.latencyMs,
      checkedAt,
      details: {
        access_control: asStr(tickets.body.access_control),
        database: asStr(tickets.body.database)
      }
    })
  }

  const summary = {
    ok: modules.filter((m) => m.status === 'ok').length,
    degraded: modules.filter((m) => m.status === 'degraded').length,
    down: modules.filter((m) => m.status === 'down').length
  }

  return NextResponse.json({ checkedAt, summary, modules })
}
