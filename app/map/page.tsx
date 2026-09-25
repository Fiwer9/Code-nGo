'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  Cpu,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Activity,
  Pencil,
  Crosshair,
  MapPin,
  Radio
} from 'lucide-react'
import Card from '@/components/Card'
import CollectorPopup, { type PopupPos } from '@/components/CollectorPopup'
import EditObjectModal from '@/components/EditObjectModal'
import type { CollectorSensor, MapObject, MapObjectStatus, SensorStatus } from '@/lib/mockData'
import {
  COLLECTOR_STATUS_META,
  deriveCollectorStatus,
  placePopupNearPoint
} from '@/lib/collectorStatus'
import { loadMapObjects, persistMapObjects } from '@/lib/mapObjectsStore'
import { updateMapObject } from '@/lib/api/mapObjects'
import type { MapSelectPoint } from '@/components/YandexMap'
import clsx from 'clsx'

const YandexMap = dynamic(() => import('@/components/YandexMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-200 text-surface-600 text-sm">
      Загрузка карты…
    </div>
  )
})

const sensorStatusUi: Record<SensorStatus, { label: string; className: string }> = {
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

const readingLevel: Record<string, string> = {
  ok: 'text-surface-900',
  warn: 'text-warning',
  alarm: 'text-danger'
}

const STATUS_KEYS = Object.keys(COLLECTOR_STATUS_META) as MapObjectStatus[]

function cloneObject(o: MapObject): MapObject {
  return {
    ...o,
    sensors: o.sensors.map((s) => ({ ...s, readings: s.readings.map((r) => ({ ...r })) }))
  }
}

function pickDefaultSensor(sensors: CollectorSensor[]) {
  return (
    sensors.find((s) => s.status === 'critical') ??
    sensors.find((s) => s.status === 'offline') ??
    sensors.find((s) => s.status === 'warning') ??
    sensors.find((s) => s.status === 'maintenance') ??
    sensors[0]
  )
}

export default function MapPage() {
  const router = useRouter()
  const mapBoxRef = useRef<HTMLDivElement>(null)
  const [objects, setObjects] = useState<MapObject[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState<PopupPos>({ x: 24, y: 24 })
  const [filter, setFilter] = useState<string>('all')
  const [editMode, setEditMode] = useState(false)
  const [editDraft, setEditDraft] = useState<MapObject | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState(false)

  useEffect(() => {
    setObjects(loadMapObjects())
  }, [])

  const objectStatus = useCallback((o: MapObject) => deriveCollectorStatus(o.sensors), [])

  const filtered =
    filter === 'all' ? objects : objects.filter((o) => objectStatus(o) === filter)
  const sel = !editMode ? objects.find((o) => o.id === selected) ?? null : null
  const selectedSensor = sel?.sensors.find((s) => s.id === selectedSensorId) ?? null
  const mapSelectedId = editMode ? editDraft?.id ?? null : selected

  const handleSelectCollector = (id: string, point: MapSelectPoint) => {
    const obj = objects.find((o) => o.id === id)
    if (!obj) return

    if (editMode) {
      setEditDraft(cloneObject(obj))
      setSaveError(null)
      setSelected(null)
      setSelectedSensorId(null)
      return
    }

    setSelected(id)
    setSelectedSensorId(pickDefaultSensor(obj.sensors)?.id ?? null)

    const box = mapBoxRef.current
    if (box) {
      const rect = box.getBoundingClientRect()
      setPopupPos(
        placePopupNearPoint(
          point.clientX - rect.left,
          point.clientY - rect.top,
          rect.width,
          rect.height
        )
      )
    }
  }

  const toggleEditMode = () => {
    setEditMode((v) => {
      const next = !v
      if (next) {
        setSelected(null)
        setSelectedSensorId(null)
      } else {
        setEditDraft(null)
        setSaveError(null)
      }
      return next
    })
  }

  const closePopup = () => {
    setSelected(null)
    setSelectedSensorId(null)
  }

  const handleCancelEdit = () => {
    if (saving) return
    setEditDraft(null)
    setSaveError(null)
  }

  const handleSaveEdit = async () => {
    if (!editDraft || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await updateMapObject(editDraft)
      setObjects((prev) => {
        const next = prev.map((o) => (o.id === saved.id ? cloneObject(saved) : o))
        persistMapObjects(next)
        return next
      })
      setEditDraft(null)
      setSavedHint(true)
      window.setTimeout(() => setSavedHint(false), 1800)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-surface-900">Карта объектов</h1>
        <button
          type="button"
          onClick={toggleEditMode}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
            editMode
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
              : 'bg-surface-200 hover:bg-surface-300 text-surface-800'
          }`}
        >
          <Pencil size={16} />
          {editMode ? 'Редактирование вкл.' : 'Редактировать объекты'}
        </button>
      </div>

      {editMode && (
        <div className="rounded-lg border border-primary-600/40 bg-primary-600/10 px-4 py-2.5 text-sm text-surface-800 flex items-start gap-2">
          <Crosshair size={16} className="mt-0.5 shrink-0 text-primary-600" />
          <span>
            Режим редактирования: кликните по объекту на карте, чтобы открыть карточку с данными,
            датчиками и координатами. Изменения сохраняются в БД по кнопке «Сохранить».
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden relative">
            <div ref={mapBoxRef} className="relative w-full h-[600px] bg-surface-200">
              <YandexMap
                objects={filtered}
                selectedId={mapSelectedId}
                onSelect={handleSelectCollector}
              />

              <div className="absolute top-4 left-4 bg-surface-100/90 backdrop-blur border border-surface-200 rounded-lg p-3 text-xs pointer-events-none z-10">
                <div className="font-semibold mb-2 text-surface-900">Легенда</div>
                <div className="space-y-1.5">
                  {STATUS_KEYS.map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${COLLECTOR_STATUS_META[k].markerClass}`} />
                      <span className="text-surface-700">{COLLECTOR_STATUS_META[k].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {sel && !editMode && (
                <CollectorPopup
                  object={sel}
                  position={popupPos}
                  selectedSensorId={selectedSensorId}
                  editMode={false}
                  latInput=""
                  lngInput=""
                  onLatChange={() => {}}
                  onLngChange={() => {}}
                  onApplyCoords={() => {}}
                  onSelectSensor={setSelectedSensorId}
                  onClose={closePopup}
                  onCreateTask={() => router.push('/requests')}
                  onGoToTask={() => router.push('/requests')}
                  onPositionChange={(pos) => {
                    const box = mapBoxRef.current
                    if (!box) {
                      setPopupPos(pos)
                      return
                    }
                    const maxX = Math.max(8, box.clientWidth - 48)
                    const maxY = Math.max(8, box.clientHeight - 48)
                    setPopupPos({
                      x: Math.min(Math.max(-8, pos.x), maxX),
                      y: Math.min(Math.max(8, pos.y), maxY)
                    })
                  }}
                />
              )}

              {savedHint && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-surface-100 border border-surface-200 text-xs text-surface-800 shadow-lg">
                  Объект сохранён
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-surface-900 mb-3">Фильтр по статусу</h3>
            <div className="space-y-2">
              {(['all', ...STATUS_KEYS] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    filter === f
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-200/50 hover:bg-surface-200 text-surface-700'
                  }`}
                >
                  {f === 'all' ? 'Все объекты' : COLLECTOR_STATUS_META[f].label}
                  <span className="float-right opacity-70">
                    {f === 'all'
                      ? objects.length
                      : objects.filter((o) => objectStatus(o) === f).length}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-3">Датчик</h3>
            {selectedSensor && sel ? (
              <SensorDetails sensor={selectedSensor} collectorId={sel.id} />
            ) : (
              <div className="text-center py-8 text-surface-500 text-sm">
                <Radio size={32} className="mx-auto mb-2 opacity-50" />
                {editMode
                  ? 'В режиме редактирования откройте объект на карте'
                  : sel
                    ? 'Выберите датчик в окне на карте'
                    : 'Выберите коллектор на карте, затем датчик'}
              </div>
            )}
          </Card>
        </div>
      </div>

      {editDraft && (
        <>
          <EditObjectModal
            draft={editDraft}
            saving={saving}
            onChange={setEditDraft}
            onCancel={handleCancelEdit}
            onSave={handleSaveEdit}
          />
          {saveError && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-danger text-white text-sm shadow-lg">
              {saveError}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SensorDetails({
  sensor,
  collectorId
}: {
  sensor: CollectorSensor
  collectorId: string
}) {
  const Icon = kindIcon[sensor.kind] || Cpu
  const ss = sensorStatusUi[sensor.status]

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-200 border border-surface-300 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-surface-800" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-surface-900 leading-tight">{sensor.name}</div>
          <div className="text-xs font-mono text-surface-500 mt-0.5">{sensor.id}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={clsx('text-[11px] px-2 py-0.5 rounded font-medium', ss.className)}>
          {ss.label}
        </span>
        <span className="text-[11px] text-surface-500 truncate">в {collectorId}</span>
      </div>

      <div>
        <div className="text-xs text-surface-500">Канал</div>
        <div className="text-sm text-surface-900 font-mono break-all">{sensor.channel}</div>
      </div>

      <div>
        <div className="text-xs text-surface-500">Расположение</div>
        <div className="text-sm text-surface-900 flex items-center gap-1.5 mt-0.5">
          <MapPin size={13} className="text-surface-500 shrink-0" />
          {sensor.place}
        </div>
      </div>

      <div>
        <div className="text-xs text-surface-500">Последний опрос</div>
        <div className="text-sm text-surface-900 font-mono">{sensor.lastCheck}</div>
      </div>

      <div className="pt-2 border-t border-surface-200">
        <div className="text-xs font-semibold text-surface-700 uppercase tracking-wide mb-2">
          Текущие показания
        </div>
        <div className="space-y-2">
          {sensor.readings.map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between gap-2 rounded-lg bg-surface-200/50 px-3 py-2"
            >
              <span className="text-xs text-surface-600">{r.label}</span>
              <span
                className={clsx(
                  'text-sm font-semibold font-mono tabular-nums',
                  readingLevel[r.level ?? 'ok']
                )}
              >
                {r.value}
                {r.unit ? (
                  <span className="text-surface-500 font-normal ml-1 text-xs">{r.unit}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
