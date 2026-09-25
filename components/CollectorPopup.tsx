'use client'

import { useCallback, useRef } from 'react'
import { X, Cpu, Thermometer, Wind, Droplets, Gauge, Activity, GripHorizontal } from 'lucide-react'
import type { CollectorSensor, MapObject, MapObjectStatus, SensorStatus } from '@/lib/mockData'
import { COLLECTOR_STATUS_META, deriveCollectorStatus } from '@/lib/collectorStatus'
import clsx from 'clsx'

const sensorStatus: Record<SensorStatus, { label: string; className: string }> = {
  online: { label: 'В сети', className: 'bg-success/15 text-success' },
  warning: { label: 'Внимание', className: 'bg-warning/15 text-warning' },
  offline: { label: 'Не в сети', className: 'bg-surface-500/15 text-surface-500' },
  maintenance: { label: 'ТО', className: 'bg-info/15 text-info' },
  critical: { label: 'Критический', className: 'bg-danger/20 text-danger' }
}

const kindIcon: Record<CollectorSensor['kind'], typeof Cpu> = {
  temperature: Thermometer,
  smoke: Droplets,
  gas: Gauge,
  movement: Activity,
  pump: Droplets,
  fan: Wind,
  level: Droplets,
  humidity: Wind
}

export type PopupPos = { x: number; y: number }

type Props = {
  object: MapObject
  position: PopupPos
  selectedSensorId: string | null
  editMode: boolean
  latInput: string
  lngInput: string
  onLatChange: (v: string) => void
  onLngChange: (v: string) => void
  onApplyCoords: () => void
  onSelectSensor: (sensorId: string) => void
  onClose: () => void
  onPositionChange: (pos: PopupPos) => void
}

export default function CollectorPopup({
  object,
  position,
  selectedSensorId,
  editMode,
  latInput,
  lngInput,
  onLatChange,
  onLngChange,
  onApplyCoords,
  onSelectSensor,
  onClose,
  onPositionChange
}: Props) {
  const status = deriveCollectorStatus(object.sensors)
  const st = COLLECTOR_STATUS_META[status]
  const onlineCount = object.sensors.filter((s) => s.status === 'online').length
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return
      if (e.button !== 0) return

      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y
      }
    },
    [position.x, position.y]
  )

  const onHeaderPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      onPositionChange({
        x: d.origX + (e.clientX - d.startX),
        y: d.origY + (e.clientY - d.startY)
      })
    },
    [onPositionChange]
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  return (
    <div
      className="absolute z-20 w-[min(380px,calc(100%-1rem))] pointer-events-auto"
      style={{ left: position.x, top: position.y }}
    >
      <div className="rounded-xl bg-surface-100/95 backdrop-blur border border-surface-200 shadow-xl shadow-surface-900/20 overflow-hidden">
        <div
          className="flex items-start gap-3 px-4 pt-3 pb-2 border-b border-surface-200 cursor-grab active:cursor-grabbing select-none touch-none"
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mt-1 text-surface-400 shrink-0" aria-hidden>
            <GripHorizontal size={16} />
          </div>
          <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${st.markerClass}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-surface-900">{object.id}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-200 text-surface-700">{object.type}</span>
            </div>
            <p className="text-xs text-surface-600 mt-0.5 truncate">{object.address}</p>
          </div>
          <button
            type="button"
            data-no-drag
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-200 text-surface-500 hover:text-surface-900 transition cursor-pointer"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 max-h-[340px] overflow-y-auto">
          <p className="text-sm text-surface-700 leading-snug">{object.description}</p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-surface-500">Статус</div>
              <div className="text-xs font-semibold text-surface-900 mt-0.5">{st.label}</div>
            </div>
            <div className="rounded-lg bg-surface-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-surface-500">Длина</div>
              <div className="text-xs font-semibold text-surface-900 mt-0.5">{object.len}</div>
            </div>
            <div className="rounded-lg bg-surface-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-surface-500">Датчики</div>
              <div className="text-xs font-semibold text-surface-900 mt-0.5">
                {onlineCount}/{object.sensors.length}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-surface-700 uppercase tracking-wide mb-2">
              Оборудование внутри
            </div>
            <div className="space-y-1.5">
              {object.sensors.map((s) => {
                const Icon = kindIcon[s.kind] || Cpu
                const ss = sensorStatus[s.status]
                const active = selectedSensorId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectSensor(s.id)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition border',
                      active
                        ? 'bg-primary-600/15 border-primary-600/50'
                        : 'bg-surface-200/40 border-transparent hover:bg-surface-200 hover:border-surface-300'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-surface-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">{s.name}</div>
                      <div className="text-[11px] text-surface-500 truncate">{s.place}</div>
                    </div>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0', ss.className)}>
                      {ss.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {editMode && (
            <div className="pt-2 border-t border-surface-200 space-y-2">
              <div className="text-xs font-semibold text-surface-700 uppercase tracking-wide">
                Координаты коллектора
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-surface-500">Широта</span>
                  <input
                    type="text"
                    value={latInput}
                    onChange={(e) => onLatChange(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-200/50 border border-surface-300 text-sm font-mono text-surface-900"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-surface-500">Долгота</span>
                  <input
                    type="text"
                    value={lngInput}
                    onChange={(e) => onLngChange(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-200/50 border border-surface-300 text-sm font-mono text-surface-900"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={onApplyCoords}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm py-2 rounded-lg transition"
              >
                Применить координаты
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
