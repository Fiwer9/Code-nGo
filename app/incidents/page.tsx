'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Flame,
  Droplet,
  UserX,
  Cpu,
  CloudLightning,
  Search,
  Filter,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import { ApiError } from '@/lib/api/types'
import type { IncidentItem } from '@/lib/api/monitoringTypes'
import {
  collectorIdOfIncident,
  exportIncidentsCsv,
  listIncidents
} from '@/lib/api/monitoring'

const iconMap: Record<string, typeof Cpu> = {
  Пожар: Flame,
  Подтопление: Droplet,
  'Несанк. доступ': UserX,
  'Несанкц. доступ': UserX,
  'Отказ датчика': Cpu,
  'Газовая утечка': CloudLightning
}

const statusLabels: Record<string, { label: string; color: string }> = {
  critical: { label: 'Критический', color: 'bg-danger/20 text-danger' },
  warning: { label: 'Внимание', color: 'bg-warning/20 text-warning' },
  info: { label: 'Информация', color: 'bg-info/20 text-info' },
  resolved: { label: 'Решён', color: 'bg-success/20 text-success' },
  open: { label: 'Открыт', color: 'bg-warning/20 text-warning' },
  closed: { label: 'Закрыт', color: 'bg-success/20 text-success' }
}

export default function IncidentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [items, setItems] = useState<IncidentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listIncidents({
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
        offset: 0
      })
      setItems(data.items || [])
      setTotal(data.pagination?.total ?? data.items?.length ?? 0)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить инциденты')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const handleExport = async () => {
    try {
      const blob = await exportIncidentsCsv({
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'incidents.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка экспорта')
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    {
      key: 'type',
      header: 'Тип',
      render: (r: IncidentItem) => {
        const Icon = iconMap[r.type] || Cpu
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-primary-400" />
            <span className="font-medium">{r.type}</span>
          </div>
        )
      }
    },
    {
      key: 'object',
      header: 'Коллектор',
      render: (r: IncidentItem) => (
        <span className="font-mono font-medium">{collectorIdOfIncident(r)}</span>
      )
    },
    {
      key: 'location',
      header: 'Локация',
      render: (r: IncidentItem) => r.location || '—'
    },
    {
      key: 'probability',
      header: 'Вероятность',
      render: (r: IncidentItem) => {
        const p = r.probability ?? 0
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface-200 rounded-full h-1.5 max-w-[60px]">
              <div
                className={`h-full rounded-full ${
                  p > 80 ? 'bg-danger' : p > 60 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, p))}%` }}
              />
            </div>
            <span className="text-xs font-mono">{p}%</span>
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Статус',
      render: (r: IncidentItem) => {
        const key = (r.status || '').toLowerCase()
        const s = statusLabels[key] || {
          label: r.status,
          color: 'bg-surface-200 text-surface-700'
        }
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
      }
    },
    {
      key: 'date',
      header: 'Дата',
      render: (r: IncidentItem) => new Date(r.date).toLocaleString('ru-RU')
    }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Журнал инцидентов</h1>
          <p className="text-surface-600 mt-1">
            События мониторинга · всего: {total}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-surface-200 hover:bg-surface-300"
        >
          <Download size={16} /> CSV
        </button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск…"
              className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-9 pr-4 py-2 text-sm"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-lg bg-surface-200 border border-surface-300 text-sm appearance-none min-w-[160px]"
            >
              <option value="all">Все статусы</option>
              <option value="critical">Критический</option>
              <option value="warning">Внимание</option>
              <option value="info">Информация</option>
              <option value="resolved">Решён</option>
            </select>
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
          <DataTable data={items} columns={columns} />
        )}
      </Card>
    </div>
  )
}
