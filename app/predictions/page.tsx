'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2
} from 'lucide-react'
import Card from '@/components/Card'
import { ApiError } from '@/lib/api/types'
import type { PredictionDecision, PredictionItem } from '@/lib/api/monitoringTypes'
import {
  collectorIdOfPrediction,
  decidePrediction,
  listAllPredictions,
  predictionDetailEntries
} from '@/lib/api/monitoring'

function probColor(p: number): 'danger' | 'warning' | 'success' {
  if (p > 80) return 'danger'
  if (p > 60) return 'warning'
  return 'success'
}

const colorClass = {
  danger: { box: 'bg-danger/10', text: 'text-danger' },
  warning: { box: 'bg-warning/10', text: 'text-warning' },
  success: { box: 'bg-success/10', text: 'text-success' }
}

export default function PredictionsPage() {
  const router = useRouter()
  const [items, setItems] = useState<PredictionItem[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<PredictionItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAllPredictions()
      setItems(data.items || [])
      setTotal(data.pagination?.total ?? data.items?.length ?? 0)
      setSelected((prev) => {
        if (!prev) return null
        return data.items.find((p) => p.id === prev.id) || null
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить прогнозы')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDecision = async (item: PredictionItem, decision: PredictionDecision) => {
    setActingId(item.id)
    setError(null)
    try {
      await decidePrediction(item.id, decision)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить решение')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Журнал прогнозов</h1>
        <p className="text-surface-600 mt-1">
          Все записи из API · коллектор = ID родителя · всего: {total}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-2 text-sm text-surface-600">
          <Loader2 className="animate-spin" size={22} /> Загрузка…
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-16 text-center text-surface-500 text-sm">Нет прогнозов</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {items.map((p) => {
              const probability = p.probability ?? 0
              const color = probColor(probability)
              const cc = colorClass[color]
              const collectorId = collectorIdOfPrediction(p)
              const busy = actingId === p.id
              return (
                <Card
                  key={p.id}
                  hover
                  onClick={() => setSelected(p)}
                  className={selected?.id === p.id ? 'border-primary-500' : ''}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl ${cc.box} flex items-center justify-center flex-shrink-0`}
                    >
                      <Brain className={cc.text} size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-surface-500">{p.id}</span>
                        {p.verified || p.decision === 'verified' || p.decision === 'accepted' ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                            <CheckCircle2 size={12} />{' '}
                            {p.decision === 'accepted' ? 'Принят' : 'Верифицировано'}
                          </span>
                        ) : p.decision === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-danger/20 text-danger px-2 py-0.5 rounded">
                            Отклонён
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                            <AlertCircle size={12} /> Ожидает проверки
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-lg text-surface-900 mb-1">
                        {p.type || 'Прогноз'} ·{' '}
                        <span className="font-mono">{collectorId}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-surface-600 flex-wrap">
                        {p.horizon && (
                          <div className="flex items-center gap-1">
                            <Clock size={14} /> Горизонт: {p.horizon}
                          </div>
                        )}
                        {p.model && (
                          <div className="flex items-center gap-1">
                            <Brain size={14} /> {p.model}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-4xl font-bold ${cc.text}`}>{probability}%</div>
                      <div className="text-xs text-surface-500 mt-1">вероятность</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-surface-200 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs bg-surface-200 hover:bg-surface-300 px-3 py-1.5 rounded-md transition flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(p)
                        }}
                      >
                        <Eye size={12} /> Детали
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs bg-success/20 text-success hover:bg-success/30 px-3 py-1.5 rounded-md transition disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDecision(p, 'accepted')
                        }}
                      >
                        Принять
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs bg-danger/20 text-danger hover:bg-danger/30 px-3 py-1.5 rounded-md transition disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDecision(p, 'rejected')
                        }}
                      >
                        Отклонить
                      </button>
                    </div>
                    {(p.date || p.created_at) && (
                      <span className="text-xs text-surface-500">
                        {new Date(p.date || p.created_at || '').toLocaleString('ru-RU')}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className="h-fit sticky top-24">
            <h3 className="font-semibold text-surface-900 mb-4">Детали прогноза</h3>
            {selected ? (
              <div className="space-y-4">
                {predictionDetailEntries(selected).map((row) => (
                  <div key={row.key}>
                    <div className="text-xs text-surface-500">{row.label}</div>
                    <div
                      className={`text-surface-900 whitespace-pre-wrap break-words ${
                        row.key === 'id' ||
                        row.key === 'parentId' ||
                        row.key === 'objectId' ||
                        row.key === 'object'
                          ? 'font-mono'
                          : ''
                      }`}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm transition"
                  onClick={() => {
                    const oid = collectorIdOfPrediction(selected)
                    router.push(
                      `/requests?object_id=${encodeURIComponent(oid)}&create=1&title=${encodeURIComponent(
                        `Проверка: ${selected.type || 'прогноз'} (${oid})`
                      )}&warning_source=${encodeURIComponent(selected.id)}`
                    )
                  }}
                >
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
      )}
    </div>
  )
}
