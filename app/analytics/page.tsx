'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp, Target, Clock, Brain, Loader2, AlertCircle } from 'lucide-react'
import Card from '@/components/Card'
import StatsCard from '@/components/StatsCard'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts'
import { useChartTheme } from '@/lib/useChartTheme'
import { ApiError } from '@/lib/api/types'
import type { IncidentItem, PredictionItem } from '@/lib/api/monitoringTypes'
import { listIncidents, listPredictions } from '@/lib/api/monitoring'

function hourBucket(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('ru-RU', { month: 'short' })
}

export default function AnalyticsPage() {
  const chart = useChartTheme()
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [predictions, setPredictions] = useState<PredictionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [incRes, predRes] = await Promise.allSettled([
      listIncidents({ limit: 500, offset: 0 }),
      listPredictions({ limit: 500, offset: 0 })
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

    setError(errors.length ? errors.join(' · ') : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const verified = useMemo(
    () =>
      predictions.filter(
        (p) => p.verified || p.decision === 'verified' || p.decision === 'accepted'
      ).length,
    [predictions]
  )
  const rejected = useMemo(
    () => predictions.filter((p) => p.decision === 'rejected').length,
    [predictions]
  )
  const decided = verified + rejected

  const accuracy = decided > 0 ? Math.round((verified / decided) * 1000) / 10 : null
  const precision =
    predictions.length > 0
      ? Math.round((verified / Math.max(1, predictions.length)) * 1000) / 10
      : null
  const recall =
    incidents.length > 0
      ? Math.round(
          (predictions.filter((p) => (p.probability ?? 0) >= 60).length /
            Math.max(1, incidents.length)) *
            1000
        ) / 10
      : null

  const hourly = useMemo(() => {
    const map = new Map<
      string,
      { hour: string; incidents: number; falseAlarms: number; predictions: number }
    >()
    for (let i = 0; i < 24; i++) {
      const h = `${String(i).padStart(2, '0')}:00`
      map.set(h, { hour: h, incidents: 0, falseAlarms: 0, predictions: 0 })
    }
    for (const inc of incidents) {
      const row = map.get(hourBucket(inc.date))
      if (!row) continue
      row.incidents += 1
      const st = (inc.status || '').toLowerCase()
      if (st.includes('info') || st.includes('false') || st.includes('ложн')) row.falseAlarms += 1
    }
    for (const p of predictions) {
      const raw = p.date || p.created_at
      if (!raw) continue
      const row = map.get(hourBucket(raw))
      if (row) row.predictions += 1
    }
    return Array.from(map.values())
  }, [incidents, predictions])

  const monthly = useMemo(() => {
    const map = new Map<
      string,
      { month: string; key: string; total: number; verified: number; incidents: number }
    >()
    const bump = (iso: string | null | undefined, kind: 'pred' | 'ver' | 'inc') => {
      if (!iso) return
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) {
        map.set(key, { month: monthLabel(d), key, total: 0, verified: 0, incidents: 0 })
      }
      const row = map.get(key)!
      if (kind === 'pred') row.total += 1
      if (kind === 'ver') row.verified += 1
      if (kind === 'inc') row.incidents += 1
    }
    for (const p of predictions) {
      bump(p.date || p.created_at, 'pred')
      if (p.verified || p.decision === 'verified' || p.decision === 'accepted') {
        bump(p.date || p.created_at, 'ver')
      }
    }
    for (const i of incidents) bump(i.date, 'inc')

    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-9)
      .map((r) => ({
        month: r.month,
        accuracy: r.total ? Math.round((r.verified / r.total) * 100) : 0,
        precision: r.total ? Math.round((r.verified / r.total) * 100) : 0,
        recall: r.incidents
          ? Math.min(100, Math.round((r.total / r.incidents) * 100))
          : r.total
            ? 100
            : 0,
        incidents: r.incidents,
        predictions: r.total
      }))
  }, [incidents, predictions])

  const modelPerf = useMemo(() => {
    const map = new Map<string, { name: string; total: number; ok: number }>()
    for (const p of predictions) {
      const name = p.model || 'Без модели'
      if (!map.has(name)) map.set(name, { name, total: 0, ok: 0 })
      const row = map.get(name)!
      row.total += 1
      if (p.verified || p.decision === 'verified' || p.decision === 'accepted') row.ok += 1
    }
    return Array.from(map.values())
      .map((m) => ({
        name: m.name,
        accuracy: m.total ? Math.round((m.ok / m.total) * 1000) / 10 : 0,
        f1: m.total ? Math.round((m.ok / m.total) * 1000) / 10 : 0,
        total: m.total
      }))
      .sort((a, b) => b.total - a.total)
  }, [predictions])

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto py-24 flex flex-col items-center gap-2 text-sm text-surface-600">
        <Loader2 className="animate-spin" size={22} /> Загрузка аналитики…
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Аналитика</h1>
        <p className="text-surface-600 mt-1">
          Сводка по инцидентам и прогнозам из API мониторинга
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Точность (Accuracy)"
          value={accuracy != null ? `${accuracy}%` : '—'}
          icon={<Target size={22} />}
          color="green"
        />
        <StatsCard
          title="Доля принятых"
          value={precision != null ? `${precision}%` : '—'}
          icon={<TrendingUp size={22} />}
          color="blue"
        />
        <StatsCard
          title="Покрытие инцидентов"
          value={recall != null ? `${Math.min(100, recall)}%` : '—'}
          icon={<Brain size={22} />}
          color="cyan"
        />
        <StatsCard
          title="Всего прогнозов"
          value={String(predictions.length)}
          icon={<Clock size={22} />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Динамика по месяцам</h3>
          {monthly.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-surface-500">
              Недостаточно данных
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month" stroke={chart.axis} fontSize={12} />
                <YAxis stroke={chart.axis} fontSize={12} />
                <Tooltip contentStyle={chart.tooltip} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#3b82f6"
                  fill="url(#g1)"
                  name="Accuracy"
                />
                <Area
                  type="monotone"
                  dataKey="precision"
                  stroke="#10b981"
                  fill="url(#g2)"
                  name="Precision"
                />
                <Area
                  type="monotone"
                  dataKey="recall"
                  stroke="#06b6d4"
                  fill="url(#g3)"
                  name="Recall"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Производительность моделей</h3>
          {modelPerf.length === 0 ? (
            <div className="py-16 text-center text-sm text-surface-500">Нет данных по моделям</div>
          ) : (
            <div className="space-y-4">
              {modelPerf.map((m) => (
                <div key={m.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm text-surface-900">
                      {m.name}{' '}
                      <span className="text-xs text-surface-500 font-normal">({m.total})</span>
                    </span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-surface-500">
                        Acc:{' '}
                        <span className="font-mono text-primary-400">{m.accuracy}%</span>
                      </span>
                      <span className="text-surface-500">
                        F1: <span className="font-mono text-success">{m.f1}%</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
                        style={{ width: `${m.accuracy}%` }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-success to-emerald-600"
                        style={{ width: `${m.f1}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">События по часам</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="hour" stroke={chart.axis} fontSize={12} />
            <YAxis stroke={chart.axis} fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={chart.tooltip} />
            <Legend />
            <Bar dataKey="incidents" fill="#ef4444" radius={[4, 4, 0, 0]} name="Инциденты" />
            <Bar dataKey="falseAlarms" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Инфо" />
            <Bar dataKey="predictions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Прогнозы" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
