'use client'
import { useState } from 'react'
import { Cpu, Thermometer, Wind, Droplets, Gauge, Search, Plus } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import { equipment } from '@/lib/mockData'

export default function EquipmentPage() {
  const [search, setSearch] = useState('')

  const iconMap: any = {
    temperature: Thermometer,
    smoke: Droplets,
    gas: Gauge,
    movement: Cpu,
    pump: Droplets,
    fan: Wind
  }

  const statusLabels: any = {
    online:      { label: 'В сети',     color: 'bg-success/20 text-success' },
    warning:     { label: 'Внимание',   color: 'bg-warning/20 text-warning' },
    offline:     { label: 'Не в сети',  color: 'bg-danger/20 text-danger' },
    maintenance: { label: 'ТО',         color: 'bg-info/20 text-info' }
  }

  const filtered = equipment.filter(e =>
    !search || e.id.includes(search) || e.name.includes(search) || e.location.includes(search)
  )

  const stats = [
    { label: 'Всего',        value: equipment.length },
    { label: 'В сети',       value: equipment.filter(e => e.status === 'online').length },
    { label: 'Внимание',     value: equipment.filter(e => e.status === 'warning').length },
    { label: 'Не в сети',    value: equipment.filter(e => e.status === 'offline').length },
    { label: 'На ТО',        value: equipment.filter(e => e.status === 'maintenance').length }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Оборудование</h1>
          <p className="text-surface-600 mt-1">Реестр датчиков и инженерных систем</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
          <Plus size={16} /> Добавить оборудование
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map(s => (
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
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по ID, названию, локации..."
              className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={[
            { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
            {
              key: 'name', header: 'Наименование', render: (r) => {
                const Icon = iconMap[r.type] || Cpu
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-900/30 flex items-center justify-center">
                      <Icon size={14} className="text-primary-400" />
                    </div>
                    <span className="font-medium">{r.name}</span>
                  </div>
                )
              }
            },
            { key: 'location', header: 'Локация', render: (r) => <span className="font-mono text-xs">{r.location}</span> },
            {
              key: 'status', header: 'Статус', render: (r) => {
                const s = statusLabels[r.status]
                return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
              }
            },
            { key: 'lastCheck', header: 'Последняя проверка' }
          ]}
        />
      </Card>
    </div>
  )
}