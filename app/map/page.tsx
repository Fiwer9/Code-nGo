'use client'
import { useState } from 'react'
import { MapPin, Filter, AlertTriangle, CheckCircle, Wrench, Layers, ZoomIn, ZoomOut, LocateFixed } from 'lucide-react'
import Card from '@/components/Card'

const objects = [
  { id: 'МК-1.1.1', x: 25, y: 30, status: 'ok',       type: 'Коллектор',   len: '2.4 км' },
  { id: 'МК-2.2.2', x: 40, y: 55, status: 'warning',  type: 'Склад К6',    len: '1.2 км' },
  { id: 'МК-3.1.2', x: 55, y: 35, status: 'ok',       type: 'Теплотрасса', len: '5.1 км' },
  { id: 'МК-4.3.2', x: 70, y: 60, status: 'offline',  type: 'Вентшахта',   len: '0.8 км' },
  { id: 'МК-6.7.8', x: 60, y: 75, status: 'critical', type: 'Камера 189',  len: '3.7 км' },
  { id: 'МК-8.5.1', x: 80, y: 40, status: 'ok',       type: 'Коллектор',   len: '4.2 км' },
  { id: 'МК-9.2.1', x: 30, y: 70, status: 'maintenance', type: 'Насосная', len: '1.5 км' }
]

const statusConfig: any = {
  ok:          { color: 'bg-success', label: 'В норме' },
  warning:     { color: 'bg-warning', label: 'Внимание' },
  critical:    { color: 'bg-danger animate-pulse-ring', label: 'Критический' },
  offline:     { color: 'bg-surface-500', label: 'Офлайн' },
  maintenance: { color: 'bg-info',    label: 'ТО' }
}

export default function MapPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? objects : objects.filter(o => o.status === filter)
  const sel = objects.find(o => o.id === selected)

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Карта объектов</h1>
          <p className="text-surface-600 mt-1">Инженерные коллекторы Москвы · 825 км</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-surface-200 hover:bg-surface-300 rounded-lg text-sm flex items-center gap-2 transition">
            <Layers size={16} /> Слои
          </button>
          <button className="px-3 py-2 bg-surface-200 hover:bg-surface-300 rounded-lg text-sm flex items-center gap-2 transition">
            <Filter size={16} /> Фильтры
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Карта */}
        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden">
            <div className="relative w-full h-[600px] bg-surface-200">
              {/* Условная сетка карты Москвы */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                    <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(107,114,128,0.15)" strokeWidth="0.2" />
                  </pattern>
                  <radialGradient id="center">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                <circle cx="50" cy="50" r="18" fill="url(#center)" />
                {/* "Кольца Москвы" */}
                <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="0.3" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="0.3" strokeDasharray="1 1" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.3" strokeDasharray="2 1" />
                {/* "Реки" */}
                <path d="M 10 30 Q 30 40 50 35 T 90 45" stroke="rgba(6,182,212,0.4)" strokeWidth="0.8" fill="none" />
                <path d="M 20 60 Q 40 70 60 65 T 95 80" stroke="rgba(6,182,212,0.3)" strokeWidth="0.6" fill="none" />
              </svg>

              {/* Маркеры */}
              {filtered.map(obj => {
                const cfg = statusConfig[obj.status]
                const active = selected === obj.id
                return (
                  <button
                    key={obj.id}
                    onClick={() => setSelected(obj.id)}
                    style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all ${active ? 'scale-125 z-20' : 'z-10 hover:scale-110'}`}
                  >
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full ${cfg.color} border-2 border-surface-50 shadow-lg`} />
                      {active && (
                        <div className="absolute inset-0 w-4 h-4 rounded-full bg-danger/40 animate-ping" />
                      )}
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-surface-100 border border-surface-200 rounded-md px-2 py-1 text-xs text-surface-900 shadow-lg opacity-0 group-hover:opacity-100 transition">
                        {obj.id} · {obj.type}
                      </div>
                    </div>
                  </button>
                )
              })}

              {/* Контролы */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button className="w-9 h-9 bg-surface-100 hover:bg-surface-200 rounded-lg border border-surface-200 flex items-center justify-center transition">
                  <ZoomIn size={16} />
                </button>
                <button className="w-9 h-9 bg-surface-100 hover:bg-surface-200 rounded-lg border border-surface-200 flex items-center justify-center transition">
                  <ZoomOut size={16} />
                </button>
                <button className="w-9 h-9 bg-surface-100 hover:bg-surface-200 rounded-lg border border-surface-200 flex items-center justify-center transition">
                  <LocateFixed size={16} />
                </button>
              </div>

              {/* Легенда */}
              <div className="absolute bottom-4 left-4 bg-surface-100/90 backdrop-blur border border-surface-200 rounded-lg p-3 text-xs">
                <div className="font-semibold mb-2 text-surface-900">Легенда</div>
                <div className="space-y-1.5">
                  {Object.entries(statusConfig).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${v.color}`} />
                      <span className="text-surface-700">{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Панель деталей */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-surface-900 mb-3">Фильтр по статусу</h3>
            <div className="space-y-2">
              {['all', ...Object.keys(statusConfig)].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    filter === f ? 'bg-primary-600 text-white' : 'bg-surface-200/50 hover:bg-surface-200 text-surface-700'
                  }`}
                >
                  {f === 'all' ? 'Все объекты' : statusConfig[f].label}
                  <span className="float-right opacity-70">
                    {f === 'all' ? objects.length : objects.filter(o => o.status === f).length}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-3">Детали объекта</h3>
            {sel ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusConfig[sel.status].color}`} />
                  <span className="font-mono font-semibold text-surface-900">{sel.id}</span>
                </div>
                <div>
                  <div className="text-xs text-surface-500">Тип</div>
                  <div className="text-sm text-surface-900">{sel.type}</div>
                </div>
                <div>
                  <div className="text-xs text-surface-500">Длина</div>
                  <div className="text-sm text-surface-900">{sel.len}</div>
                </div>
                <div>
                  <div className="text-xs text-surface-500">Статус</div>
                  <div className="text-sm text-surface-900">{statusConfig[sel.status].label}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm py-2 rounded-lg transition">
                    Подробнее
                  </button>
                  <button className="bg-surface-200 hover:bg-surface-300 text-surface-900 p-2 rounded-lg transition">
                    <MapPin size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-surface-500 text-sm">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                Выберите объект на карте
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}