'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cpu, Thermometer, Wind, Droplets, Gauge, Search, AlertCircle, Loader2 } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import { ApiError } from '@/lib/api/types'
import type { EquipmentItem } from '@/lib/api/monitoringTypes'
import {
  collectorIdOfEquipment,
  computeEquipmentStats
} from '@/lib/api/monitoring'
import { getEquipmentCached, peekEquipmentCache } from '@/lib/equipmentCache'

const iconMap: Record<string, typeof Cpu> = {
  temperature: Thermometer,
  smoke: Droplets,
  gas: Gauge,
  movement: Cpu,
  pump: Droplets,
  fan: Wind,
  level: Droplets,
  humidity: Wind
}

const statusLabels: Record<string, { label: string; color: string }> = {
  online: { label: 'В сети', color: 'bg-success/20 text-success' },
  warning: { label: 'Внимание', color: 'bg-warning/20 text-warning' },
  offline: { label: 'Не в сети', color: 'bg-danger/20 text-danger' },
  maintenance: { label: 'ТО', color: 'bg-info/20 text-info' }
}

function statusKey(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('warn')) return 'warning'
  if (s.includes('off')) return 'offline'
  if (s.includes('maint') || s.includes('то')) return 'maintenance'
  if (s.includes('online') || s.includes('ок') || s.includes('норм')) return 'online'
  return s || 'online'
}

export default function EquipmentPage() {
  const [search, setSearch] = useState('')
  const cached = peekEquipmentCache()
  const [items, setItems] = useState<EquipmentItem[]>(cached?.items ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const q = search.trim()
    if (!q && !peekEquipmentCache()) setLoading(true)
    else if (q) setLoading(true)
    setError(null)
    try {
      const data = await getEquipmentCached({
        search: q || undefined,
        onUpdate: (fresh) => {
          if (!search.trim()) setItems(fresh.items || [])
        }
      })
      setItems(data.items || [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить оборудование')
      if (!peekEquipmentCache() || q) setItems([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const stats = useMemo(() => computeEquipmentStats(items), [items])
  const collectors = useMemo(() => {
    const set = new Set(items.map(collectorIdOfEquipment))
    return set.size
  }, [items])

  const kpi = [
    { label: 'Всего датчиков', value: stats.total },
    { label: 'Коллекторов', value: collectors },
    { label: 'В сети', value: stats.online },
    { label: 'Внимание', value: stats.warning },
    { label: 'Не в сети', value: stats.offline },
    { label: 'На ТО', value: stats.maintenance }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Оборудование</h1>
        <p className="text-surface-600 mt-1">
          Реестр датчиков по коллекторам (ID родителя = ID коллектора). Список кешируется;
          статусы обновляются в фоне.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpi.map((s) => (
          <Card key={s.label}>
            <div className="text-xs text-surface-600">{s.label}</div>
            <div className="text-2xl font-bold text-surface-900 mt-1">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ID датчика, коллектору, типу…"
              className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-2 text-sm text-surface-600">
            <Loader2 className="animate-spin" size={22} /> Загрузка…
          </div>
        ) : (
          <DataTable
            data={items}
            columns={[
              {
                key: 'id',
                header: 'ID датчика',
                render: (r: EquipmentItem) => <span className="font-mono text-xs">{r.id}</span>
              },
              {
                key: 'parent',
                header: 'Коллектор',
                render: (r: EquipmentItem) => (
                  <span className="font-mono font-medium">{collectorIdOfEquipment(r)}</span>
                )
              },
              {
                key: 'type',
                header: 'Тип',
                render: (r: EquipmentItem) => {
                  const kind = (r.sensor_type || r.type || '').toLowerCase()
                  const Icon =
                    Object.entries(iconMap).find(([k]) => kind.includes(k))?.[1] || Cpu
                  return (
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-primary-400" />
                      <span>{r.sensor_type || r.type}</span>
                    </div>
                  )
                }
              },
              { key: 'system_type', header: 'Система' },
              {
                key: 'status',
                header: 'Статус',
                render: (r: EquipmentItem) => {
                  const key = statusKey(r.status)
                  const s = statusLabels[key] || {
                    label: r.status,
                    color: 'bg-surface-200 text-surface-700'
                  }
                  return (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
                      {s.label}
                    </span>
                  )
                }
              },
              {
                key: 'lastCheck',
                header: 'Проверка',
                render: (r: EquipmentItem) =>
                  r.lastCheck ? new Date(r.lastCheck).toLocaleString('ru-RU') : '—'
              }
            ]}
          />
        )}
      </Card>
    </div>
  )
}
