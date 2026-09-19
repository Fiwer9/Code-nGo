'use client'
import { useState } from 'react'
import { Flame, Droplet, UserX, Cpu, CloudLightning, Search, Filter, Download } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import { incidents } from '@/lib/mockData'

export default function IncidentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const iconMap: any = {
    'Пожар':          Flame,
    'Подтопление':    Droplet,
    'Несанк. доступ': UserX,
    'Отказ датчика':  Cpu,
    'Газовая утечка': CloudLightning
  }

  const statusLabels: any = {
    critical: { label: 'Критический', color: 'bg-danger/20 text-danger' },
    warning:  { label: 'Внимание',    color: 'bg-warning/20 text-warning' },
    info:     { label: 'Информация',  color: 'bg-info/20 text-info' },
    resolved: { label: 'Решён',       color: 'bg-success/20 text-success' }
  }

  const filtered = incidents.filter(i => {
    const matchesSearch = !search || i.id.includes(search) || i.object.includes(search) || i.location.includes(search)
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const columns = [
    { key: 'id', header: 'ID' },
    {
      key: 'type', header: 'Тип', render: (r: any) => {
        const Icon = iconMap[r.type] || Cpu
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-primary-400" />
            <span className="font-medium">{r.type}</span>
          </div>
        )
      }
    },
    { key: 'object', header: 'Объект' },
    { key: 'location', header: 'Локация' },
    {
      key: 'probability', header: 'Вероятность', render: (r: any) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-surface-200 rounded-full h-1.5 max-w-[60px]">
            <div
              className={`h-full rounded-full ${r.probability > 80 ? 'bg-danger' : r.probability > 60 ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${r.probability}%` }}
            />
          </div>
          <span className="text-xs font-mono">{r.probability}%</span>
        </div>
      )
    },
    {
      key: 'status', header: 'Статус', render: (r: any) => {
        const s = statusLabels[r.status]
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
      }
    },
    { key: 'date', header: 'Дата' }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Журнал инцидентов</h1>
        <p className="text-surface-600 mt-1">История и актуальные события системы мониторинга</p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по ID, объекту, локации..."
              className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          >
            <option value="all">Все статусы</option>
            <option value="critical">Критические</option>
            <option value="warning">Внимание</option>
            <option value="info">Информация</option>
            <option value="resolved">Решённые</option>
          </select>
          <button className="bg-surface-200 hover:bg-surface-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <Filter size={16} /> Фильтры
          </button>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <Download size={16} /> Экспорт CSV
          </button>
        </div>

        <DataTable data={filtered} columns={columns} onRowClick={(r) => console.log('Open', r)} />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-200 text-sm">
          <span className="text-surface-600">Показано {filtered.length} из {incidents.length}</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(p => (
              <button key={p} className={`w-8 h-8 rounded ${p === 1 ? 'bg-primary-600 text-white' : 'bg-surface-200 hover:bg-surface-300 text-surface-700'} transition`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}