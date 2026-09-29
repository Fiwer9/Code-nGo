'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Activity,
  Cpu,
  CheckCircle,
  Flame,
  Droplet,
  UserX,
  Loader2,
  AlertCircle
} from 'lucide-react'
import StatsCard from '@/components/StatsCard'
import Card from '@/components/Card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import Link from 'next/link'
import { useChartTheme } from '@/lib/useChartTheme'
import { ApiError } from '@/lib/api/types'
import type { EquipmentStats, IncidentItem, PredictionItem } from '@/lib/api/monitoringTypes'
import {
  collectorIdOfIncident,
  listIncidents,
  listPredictions
} from '@/lib/api/monitoring'
import { getEquipmentCached, peekEquipmentCache } from '@/lib/equipmentCache'

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#10b981']

function hourBucket(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

function buildHourlyChart(incidents: IncidentItem[], predictions: PredictionItem[]) {
  const map = new Map<string, { hour: string; incidents: number; predictions: number; falseAlarms: number }>()
  const ensure = (h: string) => {
    if (!map.has(h)) map.set(h, { hour: h, incidents: 0, predictions: 0, falseAlarms: 0 })
    return map.get(h)!
  }
  for (let i = 0; i < 24; i++) ensure(`${String(i).padStart(2, '0')}:00`)

  for (const inc of incidents) {
    const row = ensure(hourBucket(inc.date))
    row.incidents += 1
    const st = (inc.status || '').toLowerCase()
    if (st.includes('false') || st.includes('ложн') || st === 'info') row.falseAlarms += 1
  }
  for (const p of predictions) {
    const raw = p.date || p.created_at
    if (!raw) continue
    ensure(hourBucket(raw)).predictions += 1
  }
  return Array.from(map.values()).sort((a, b) => a.hour.localeCompare(b.hour))
}

function buildTypePie(incidents: IncidentItem[]) {
  const counts = new Map<string, number>()
  for (const inc of incidents) {
    const t = inc.type || 'Прочее'
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }))
    .sort((a, b) => b.value - a.value)
}

export default function DashboardPage() {
  const chart = useChartTheme()
  const cachedEq = peekEquipmentCache()
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [predictions, setPredictions] = useState<PredictionItem[]>([])
  const [eqStats, setEqStats] = useState<EquipmentStats | null>(cachedEq?.stats ?? null)
  const [loading, setLoading] = useState(!cachedEq)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // При тёплом кеше не блокируем весь дашборд спиннером
    if (!peekEquipmentCache()) setLoading(true)
    setError(null)

    const [incRes, predRes, eqRes] = await Promise.allSettled([
      listIncidents({ limit: 200, offset: 0 }),
      listPredictions({ limit: 200, offset: 0 }),
      getEquipmentCached({
        onUpdate: (data) => setEqStats(data.stats)
      })
    ])

    const errors: string[] = []

    if (incRes.status === 'fulfilled') {
      setIncidents(incRes.value.items || [])
    } else {
      setIncidents([])
      errors.push(
        `Инциденты: ${incRes.reason instanceof ApiError ? incRes.reason.message : 'ошибка'}`
      )
    }

    if (predRes.status === 'fulfilled') {
      setPredictions(predRes.value.items || [])
    } else {
      setPredictions([])
      errors.push(
        `Прогнозы: ${predRes.reason instanceof ApiError ? predRes.reason.message : 'ошибка'}`
      )
    }

    if (eqRes.status === 'fulfilled') {
      setEqStats(eqRes.value.stats)
    } else if (!peekEquipmentCache()) {
      setEqStats(null)
      errors.push(
        `Оборудование: ${eqRes.reason instanceof ApiError ? eqRes.reason.message : 'ошибка'}`
      )
    }

    setError(errors.length ? errors.join(' · ') : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeIncidents = useMemo(
    () =>
      incidents.filter((i) => {
        const s = (i.status || '').toLowerCase()
        return !s.includes('resolv') && !s.includes('закры') && !s.includes('closed')
      }),
    [incidents]
  )

  const resolvedToday = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return incidents.filter((i) => {
      const s = (i.status || '').toLowerCase()
      if (!s.includes('resolv') && !s.includes('закры') && !s.includes('closed')) return false
      return new Date(i.date) >= start
    }).length
  }, [incidents])

  const predictionsToday = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return predictions.filter((p) => {
      const raw = p.date || p.created_at
      if (!raw) return true
      return new Date(raw) >= start
    }).length
  }, [predictions])

  const onlinePct = useMemo(() => {
    if (!eqStats || eqStats.total === 0) return '—'
    return `${Math.round((eqStats.online / eqStats.total) * 100)}%`
  }, [eqStats])

  const chartData = useMemo(
    () => buildHourlyChart(incidents, predictions),
    [incidents, predictions]
  )
  const pieData = useMemo(() => buildTypePie(incidents), [incidents])

  const criticalList = useMemo(() => {
    const rank = (s: string) => {
      const x = s.toLowerCase()
      if (x.includes('crit') || x.includes('крит')) return 0
      if (x.includes('warn') || x.includes('внима')) return 1
      return 2
    }
    return [...incidents].sort((a, b) => rank(a.status) - rank(b.status)).slice(0, 6)
  }, [incidents])

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto py-24 flex flex-col items-center gap-2 text-sm text-surface-600">
        <Loader2 className="animate-spin" size={22} /> Загрузка дашборда…
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Дашборд</h1>
        <p className="text-surface-600 mt-1">
          Мониторинг по данным API · коллекторы по parentId
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Активных инцидентов"
          value={String(activeIncidents.length)}
          icon={<AlertTriangle size={22} />}
          color="red"
        />
        <StatsCard
          title="Прогнозов сегодня"
          value={String(predictionsToday)}
          icon={<Activity size={22} />}
          color="blue"
        />
        <StatsCard
          title="Оборудование онлайн"
          value={onlinePct}
          icon={<Cpu size={22} />}
          color="green"
        />
        <StatsCard
          title="Решено за сутки"
          value={String(resolvedToday)}
          icon={<CheckCircle size={22} />}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">
            Инциденты и прогнозы по часам
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={12} />
              <YAxis stroke={chart.axis} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={chart.tooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="incidents"
                stroke="#ef4444"
                strokeWidth={2}
                name="Инциденты"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="falseAlarms"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Инфо / ложные"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="predictions"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Прогнозы"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Типы инцидентов</h3>
          {pieData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-surface-500">
              Нет данных
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chart.tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-surface-700">{d.name}</span>
                    </div>
                    <span className="font-semibold text-surface-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900">Последние инциденты</h3>
          <Link href="/incidents" className="text-sm text-primary-400 hover:text-primary-300">
            Показать все →
          </Link>
        </div>
        <div className="space-y-3">
          {criticalList.length === 0 ? (
            <div className="text-sm text-surface-500 py-6 text-center">Нет инцидентов</div>
          ) : (
            criticalList.map((inc) => {
              const st = (inc.status || '').toLowerCase()
              const meta =
                st.includes('crit') || st.includes('крит')
                  ? { bg: 'bg-danger/10', text: 'text-danger', icon: Flame, label: 'КРИТИЧЕСКИЙ' }
                  : st.includes('warn') || st.includes('внима')
                    ? { bg: 'bg-warning/10', text: 'text-warning', icon: Droplet, label: 'ВНИМАНИЕ' }
                    : { bg: 'bg-info/10', text: 'text-info', icon: UserX, label: 'ИНФО' }
              const Icon = meta.icon
              return (
                <div
                  key={inc.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-surface-200/30 hover:bg-surface-200/60 transition"
                >
                  <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center`}>
                    <Icon size={18} className={meta.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold ${meta.text}`}>{meta.label}</span>
                      <span className="text-xs text-surface-500">{inc.id}</span>
                    </div>
                    <div className="font-medium text-surface-900 truncate">
                      {inc.type} · <span className="font-mono">{collectorIdOfIncident(inc)}</span>
                    </div>
                    <div className="text-xs text-surface-500 truncate">{inc.location || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-surface-900">
                      {inc.probability ?? '—'}
                      {inc.probability != null ? '%' : ''}
                    </div>
                    <div className="text-xs text-surface-500">
                      {new Date(inc.date).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
