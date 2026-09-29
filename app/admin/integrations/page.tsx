'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Database,
  Ticket,
  Map,
  Server
} from 'lucide-react'
import Card from '@/components/Card'

type HealthStatus = 'ok' | 'degraded' | 'down'

type IntegrationModule = {
  id: string
  name: string
  type: string
  description: string
  endpoint: string
  status: HealthStatus
  latencyMs: number | null
  checkedAt: string
  details: Record<string, string>
  error?: string
}

type HealthResponse = {
  checkedAt: string
  summary: { ok: number; degraded: number; down: number }
  modules: IntegrationModule[]
}

const statusUi: Record<
  HealthStatus,
  { color: string; bg: string; label: string; Icon: typeof CheckCircle2 }
> = {
  ok: { color: 'text-success', bg: 'bg-success/20', label: 'Работает', Icon: CheckCircle2 },
  degraded: {
    color: 'text-warning',
    bg: 'bg-warning/20',
    label: 'Частично',
    Icon: AlertTriangle
  },
  down: { color: 'text-danger', bg: 'bg-danger/20', label: 'Недоступен', Icon: XCircle }
}

function moduleIcon(id: string) {
  if (id.includes('db')) return Database
  if (id.includes('ticket')) return Ticket
  if (id.includes('yandex') || id.includes('map')) return Map
  return Server
}

export default function IntegrationsPage() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/health', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as HealthResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось проверить интеграции')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [load])

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Интеграции</h1>
          <p className="text-surface-600 mt-1">
            Состояние рабочих модулей по эндпоинтам <span className="font-mono">/health</span>
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Обновить
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3 max-w-lg">
          <Card>
            <div className="text-xs text-surface-600">Работают</div>
            <div className="text-2xl font-bold text-success mt-1">{data.summary.ok}</div>
          </Card>
          <Card>
            <div className="text-xs text-surface-600">Частично</div>
            <div className="text-2xl font-bold text-warning mt-1">{data.summary.degraded}</div>
          </Card>
          <Card>
            <div className="text-xs text-surface-600">Недоступны</div>
            <div className="text-2xl font-bold text-danger mt-1">{data.summary.down}</div>
          </Card>
        </div>
      )}

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 flex flex-col items-center gap-2 text-sm text-surface-600">
          <Loader2 className="animate-spin" size={22} /> Проверка /health…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.modules || []).map((m) => {
            const s = statusUi[m.status]
            const StatusIcon = s.Icon
            const ModIcon = moduleIcon(m.id)
            return (
              <Card key={m.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-900/30 flex items-center justify-center">
                    <ModIcon size={20} className="text-primary-400" />
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${s.bg} ${s.color}`}
                  >
                    <StatusIcon size={12} />
                    {s.label}
                  </div>
                </div>

                <h3 className="font-semibold text-surface-900 text-lg mb-1">{m.name}</h3>
                <div className="text-xs text-surface-500 mb-1">{m.type}</div>
                <p className="text-sm text-surface-600 mb-4">{m.description}</p>

                <div className="space-y-2 text-sm pt-3 border-t border-surface-200">
                  <div>
                    <div className="text-xs text-surface-500">Health</div>
                    <div className="font-mono text-surface-900 truncate">{m.endpoint}</div>
                  </div>
                  {m.latencyMs != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-500">Задержка</span>
                      <span className="font-mono text-surface-800">{m.latencyMs} мс</span>
                    </div>
                  )}
                  {Object.entries(m.details)
                    .filter(([k]) => k !== 'URL')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-xs">
                        <span className="text-surface-500 shrink-0">{k}</span>
                        <span className="font-mono text-surface-800 text-right truncate">{v}</span>
                      </div>
                    ))}
                  {m.details.URL && (
                    <div>
                      <div className="text-xs text-surface-500">Host</div>
                      <div className="font-mono text-xs text-surface-800 truncate">
                        {m.details.URL}
                      </div>
                    </div>
                  )}
                  {m.error && (
                    <div className="text-xs text-danger bg-danger/10 rounded px-2 py-1.5">
                      {m.error}
                    </div>
                  )}
                  <div className="text-[11px] text-surface-500 pt-1">
                    Проверено:{' '}
                    {new Date(m.checkedAt).toLocaleString('ru-RU')}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="flex-1 bg-surface-200 hover:bg-surface-300 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Проверить
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && data && data.modules.length === 0 && (
        <Card>
          <div className="py-10 text-center text-sm text-surface-500 flex flex-col items-center gap-2">
            <Link2 size={28} className="opacity-40" />
            Нет модулей для отображения
          </div>
        </Card>
      )}
    </div>
  )
}
