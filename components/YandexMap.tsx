'use client'

import { useMemo } from 'react'
import { YMaps, Map, Placemark, ZoomControl, GeolocationControl } from '@pbe/react-yandex-maps'
import type { MapObject } from '@/lib/mockData'
import { COLLECTOR_STATUS_META, deriveCollectorStatus } from '@/lib/collectorStatus'

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423]

export type MapSelectPoint = { clientX: number; clientY: number }

type Props = {
  objects: MapObject[]
  selectedId: string | null
  onSelect: (id: string, point: MapSelectPoint) => void
}

function readClientPoint(e: any): MapSelectPoint {
  const de = e?.get?.('domEvent')
  if (de && typeof de.get === 'function') {
    return { clientX: de.get('clientX') as number, clientY: de.get('clientY') as number }
  }
  const oe = de?.originalEvent ?? e?.originalEvent
  return {
    clientX: oe?.clientX ?? 0,
    clientY: oe?.clientY ?? 0
  }
}

export default function YandexMap({ objects, selectedId, onSelect }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY

  const defaultState = useMemo(
    () => ({
      center: MOSCOW_CENTER,
      zoom: 11,
      controls: [] as string[]
    }),
    []
  )

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-200 text-surface-600 text-sm p-6 text-center">
        Не задан ключ Яндекс.Карт. Добавьте{' '}
        <code className="mx-1 px-1.5 py-0.5 rounded bg-surface-300/50">NEXT_PUBLIC_YANDEX_MAPS_KEY</code>
        в <code className="mx-1 px-1.5 py-0.5 rounded bg-surface-300/50">.env.local</code> и перезапустите{' '}
        <code className="mx-1 px-1.5 py-0.5 rounded bg-surface-300/50">npm run dev</code>.
      </div>
    )
  }

  return (
    <YMaps query={{ apikey: apiKey, lang: 'ru_RU' }}>
      <Map
        defaultState={defaultState}
        width="100%"
        height="100%"
        options={{ suppressMapOpenBlock: true }}
        modules={['control.ZoomControl', 'control.GeolocationControl']}
      >
        <ZoomControl options={{ position: { right: 16, bottom: 100 } }} />
        <GeolocationControl options={{ position: { right: 16, bottom: 160 } }} />

        {objects.map((obj) => {
          const selected = selectedId === obj.id
          const status = deriveCollectorStatus(obj.sensors)
          const color = COLLECTOR_STATUS_META[status].color

          return (
            <Placemark
              key={`${obj.id}-${status}-${obj.lat}-${obj.lng}`}
              geometry={[obj.lat, obj.lng]}
              options={{
                preset: selected ? 'islands#dotIcon' : 'islands#circleDotIcon',
                iconColor: color,
                draggable: false,
                zIndex: selected ? 1000 : 100,
                zIndexHover: 900,
                openBalloonOnClick: false,
                hasBalloon: false
              }}
              properties={{
                hintContent: `${obj.id} · ${obj.type} · ${obj.sensors.length} датч. · ${COLLECTOR_STATUS_META[status].label}`
              }}
              onClick={(e: any) => {
                e.stopPropagation()
                onSelect(obj.id, readClientPoint(e))
              }}
            />
          )
        })}
      </Map>
    </YMaps>
  )
}
