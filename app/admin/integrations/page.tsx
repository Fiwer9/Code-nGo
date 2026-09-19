'use client'
import { Link2, CheckCircle2, XCircle, RefreshCw, Plus, Settings } from 'lucide-react'
import Card from '@/components/Card'
import { integrations } from '@/lib/mockData'

export default function IntegrationsPage() {
  const statusColors: any = {
    connected:    { color: 'text-success', bg: 'bg-success/20', label: 'Подключено' },
    disconnected: { color: 'text-danger',  bg: 'bg-danger/20',  label: 'Отключено' },
    error:        { color: 'text-warning', bg: 'bg-warning/20', label: 'Ошибка' }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Интеграции</h1>
          <p className="text-surface-600 mt-1">Подключения к внешним системам (СМВУ, ОДС, LDAP и др.)</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Plus size={16} /> Новая интеграция
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(i => {
          const s = statusColors[i.status]
          return (
            <Card key={i.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary-900/30 flex items-center justify-center">
                  <Link2 size={20} className="text-primary-400" />
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${s.bg} ${s.color}`}>
                  {i.status === 'connected' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {s.label}
                </div>
              </div>

              <h3 className="font-semibold text-surface-900 text-lg mb-1">{i.name}</h3>
              <div className="text-xs text-surface-500 mb-4">{i.type}</div>

              <div className="space-y-2 text-sm pt-3 border-t border-surface-200">
                <div>
                  <div className="text-xs text-surface-500">Endpoint</div>
                  <div className="font-mono text-surface-900 truncate">{i.endpoint}</div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-surface-500">Последняя синхр.</div>
                    <div className="text-surface-900">{i.lastSync}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 bg-surface-200 hover:bg-surface-300 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 transition">
                  <RefreshCw size={14} /> Тест
                </button>
                <button className="bg-surface-200 hover:bg-surface-300 p-2 rounded-lg transition">
                  <Settings size={14} />
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}