'use client'

import { useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { CollectorSensor, MapObject, SensorStatus } from '@/lib/mockData'
import { COLLECTOR_STATUS_META, deriveCollectorStatus } from '@/lib/collectorStatus'
import clsx from 'clsx'

const SENSOR_STATUSES: { value: SensorStatus; label: string }[] = [
  { value: 'online', label: 'В сети' },
  { value: 'warning', label: 'Внимание' },
  { value: 'critical', label: 'Критический' },
  { value: 'offline', label: 'Не в сети' },
  { value: 'maintenance', label: 'ТО' }
]

const KIND_LABELS: Record<CollectorSensor['kind'], string> = {
  temperature: 'Температура',
  smoke: 'Задымление',
  gas: 'Газ',
  movement: 'Движение',
  pump: 'Насос',
  fan: 'Вентиляция',
  level: 'Уровень',
  humidity: 'Влажность'
}

const inputClass =
  'mt-1 w-full px-2.5 py-2 rounded-lg bg-surface-200/50 border border-surface-300 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-600/40'

type Props = {
  draft: MapObject
  saving: boolean
  onChange: (next: MapObject) => void
  onCancel: () => void
  onSave: () => void
}

export default function EditObjectModal({ draft, saving, onChange, onCancel, onSave }: Props) {
  const status = deriveCollectorStatus(draft.sensors)
  const st = COLLECTOR_STATUS_META[status]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const patch = (partial: Partial<MapObject>) => onChange({ ...draft, ...partial })

  const patchSensor = (sensorId: string, partial: Partial<CollectorSensor>) => {
    onChange({
      ...draft,
      sensors: draft.sensors.map((s) => (s.id === sensorId ? { ...s, ...partial } : s))
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => {
        if (!saving) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-object-title"
        className="w-full max-w-2xl max-h-[min(90vh,820px)] flex flex-col rounded-2xl bg-surface-100 border border-surface-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-200 shrink-0">
          <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${st.markerClass}`} />
          <div className="flex-1 min-w-0">
            <h2 id="edit-object-title" className="text-lg font-bold text-surface-900">
              Редактирование объекта
            </h2>
            <p className="text-sm text-surface-600 mt-0.5 font-mono">{draft.id}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-surface-900 transition disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
              Основные данные
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className="text-xs text-surface-500">Тип</span>
                <input
                  className={inputClass}
                  value={draft.type}
                  onChange={(e) => patch({ type: e.target.value })}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-surface-500">Адрес</span>
                <input
                  className={inputClass}
                  value={draft.address}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-surface-500">Длина участка</span>
                <input
                  className={inputClass}
                  value={draft.len}
                  onChange={(e) => patch({ len: e.target.value })}
                />
              </label>
              <div className="block">
                <span className="text-xs text-surface-500">Статус (по датчикам)</span>
                <div className="mt-1 px-2.5 py-2 rounded-lg bg-surface-200/40 border border-surface-300 text-sm font-medium text-surface-900">
                  {st.label}
                </div>
              </div>
              <label className="block sm:col-span-2">
                <span className="text-xs text-surface-500">Описание</span>
                <textarea
                  className={clsx(inputClass, 'min-h-[72px] resize-y')}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
              Координаты
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-surface-500">Широта</span>
                <input
                  className={clsx(inputClass, 'font-mono')}
                  value={String(draft.lat)}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(',', '.'))
                    if (Number.isFinite(v)) patch({ lat: v })
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs text-surface-500">Долгота</span>
                <input
                  className={clsx(inputClass, 'font-mono')}
                  value={String(draft.lng)}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(',', '.'))
                    if (Number.isFinite(v)) patch({ lng: v })
                  }}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
              Датчики ({draft.sensors.length})
            </h3>
            <div className="space-y-3">
              {draft.sensors.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-surface-200 bg-surface-200/30 p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-surface-500">{s.id}</span>
                    <span className="text-[11px] text-surface-500">
                      {KIND_LABELS[s.kind] ?? s.kind}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-surface-500">Название</span>
                      <input
                        className={inputClass}
                        value={s.name}
                        onChange={(e) => patchSensor(s.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-surface-500">Канал датчика</span>
                      <input
                        className={clsx(inputClass, 'font-mono text-xs')}
                        value={s.channel}
                        onChange={(e) => patchSensor(s.id, { channel: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-surface-500">Расположение</span>
                      <input
                        className={inputClass}
                        value={s.place}
                        onChange={(e) => patchSensor(s.id, { place: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-surface-500">Статус</span>
                      <select
                        className={inputClass}
                        value={s.status}
                        onChange={(e) =>
                          patchSensor(s.id, { status: e.target.value as SensorStatus })
                        }
                      >
                        {SENSOR_STATUSES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="block sm:col-span-2">
                      <span className="text-xs text-surface-500">Последний опрос</span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="text-[11px] px-2 py-1 rounded-md bg-surface-100 border border-surface-200 text-surface-700 font-mono">
                          {s.lastCheck}
                        </span>
                      </div>
                    </div>
                  </div>
                  {s.readings.length > 0 && (
                    <div className="pt-1 border-t border-surface-300/50">
                      <div className="text-[11px] text-surface-500 mb-1.5">
                        Показания с датчика
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.readings.map((r) => (
                          <span
                            key={r.label}
                            className="text-[11px] px-2 py-1 rounded-md bg-surface-100 border border-surface-200 text-surface-700 font-mono"
                          >
                            {r.label}: {r.value}
                            {r.unit ? ` ${r.unit}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-200 bg-surface-100/80">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-200 hover:bg-surface-300 text-surface-800 transition disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-900/25 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
