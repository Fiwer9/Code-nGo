'use client'
import { useState } from 'react'
import { Brain, Clock, AlertCircle, CheckCircle2, XCircle, Eye } from 'lucide-react'
import Card from '@/components/Card'
import { predictions } from '@/lib/mockData'

export default function PredictionsPage() {
  const [selected, setSelected] = useState<any>(null)

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Журнал прогнозов</h1>
        <p className="text-surface-600 mt-1">Результаты работы ML-моделей предиктивной аналитики</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {predictions.map(p => {
            const color = p.probability > 80 ? 'danger' : p.probability > 60 ? 'warning' : 'success'
            return (
              <Card
                key={p.id}
                hover
                onClick={() => setSelected(p)}
                className={selected?.id === p.id ? 'border-primary-500' : ''}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                    <Brain className={`text-${color}`} size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-surface-500">{p.id}</span>
                      {p.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                          <CheckCircle2 size={12} /> Верифицировано
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                          <AlertCircle size={12} /> Ожидает проверки
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-lg text-surface-900 mb-1">
                      {p.type} · <span className="font-mono">{p.object}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-surface-600">
                      <div className="flex items-center gap-1">
                        <Clock size={14} /> Горизонт: {p.horizon}
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain size={14} /> {p.model}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-4xl font-bold text-${color}`}>{p.probability}%</div>
                    <div className="text-xs text-surface-500 mt-1">вероятность</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-200 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button className="text-xs bg-surface-200 hover:bg-surface-300 px-3 py-1.5 rounded-md transition flex items-center gap-1">
                      <Eye size={12} /> Детали
                    </button>
                    <button className="text-xs bg-success/20 text-success hover:bg-success/30 px-3 py-1.5 rounded-md transition">
                      Принять
                    </button>
                    <button className="text-xs bg-danger/20 text-danger hover:bg-danger/30 px-3 py-1.5 rounded-md transition">
                      Отклонить
                    </button>
                  </div>
                  <span className="text-xs text-surface-500">inference: 4.2с</span>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="h-fit sticky top-24">
          <h3 className="font-semibold text-surface-900 mb-4">Детали прогноза</h3>
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-surface-500">ID прогноза</div>
                <div className="font-mono text-surface-900">{selected.id}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500">ML-модель</div>
                <div className="text-surface-900">{selected.model}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500">Горизонт</div>
                <div className="text-surface-900">{selected.horizon}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500 mb-2">Факторы риска</div>
                <div className="space-y-2">
                  {[
                    { label: 'Температура',    value: 85, color: 'danger' },
                    { label: 'Задымление',     value: 62, color: 'warning' },
                    { label: 'Исторические паттерны', value: 91, color: 'danger' },
                    { label: 'Погодные условия',     value: 45, color: 'success' }
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-surface-700">{f.label}</span>
                        <span className="font-mono text-surface-900">{f.value}</span>
                      </div>
                      <div className="h-1.5 bg-surface-200 rounded-full">
                        <div className={`h-full bg-${f.color} rounded-full`} style={{ width: `${f.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm transition">
                Создать заявку на проверку
              </button>
            </div>
          ) : (
            <div className="text-center py-10 text-surface-500 text-sm">
              <Brain size={32} className="mx-auto mb-2 opacity-50" />
              Выберите прогноз
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}