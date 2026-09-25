export const incidents = [
  { id: 'INC-2026-0842', object: 'МК-6.7.8.2.2.189', type: 'Подтопление', status: 'critical', probability: 92, date: '19.09.2026 14:32', location: 'Камера 189, ул. Тверская' },
  { id: 'INC-2026-0841', object: 'МК-2.2.2.2.2.14',  type: 'Пожар',        status: 'warning',  probability: 78, date: '19.09.2026 14:18', location: 'Склад К6, ш. Энтузиастов' },
  { id: 'INC-2026-0840', object: 'МК-1.1.1.1.1.1',   type: 'Несанк. доступ', status: 'warning',  probability: 65, date: '19.09.2026 13:55', location: 'Адм. здание К1' },
  { id: 'INC-2026-0839', object: 'МК-4.3.2.1.5.7',   type: 'Отказ датчика',  status: 'info',     probability: 45, date: '19.09.2026 12:41', location: 'Вентшахта В-44' },
  { id: 'INC-2026-0838', object: 'МК-8.5.1.3.2.9',   type: 'Газовая утечка', status: 'resolved', probability: 88, date: '19.09.2026 11:20', location: 'Коллектор К8-5' },
  { id: 'INC-2026-0837', object: 'МК-3.1.2.4.1.2',   type: 'Подтопление',    status: 'resolved', probability: 71, date: '19.09.2026 10:05', location: 'Камера 12, Ленинский пр.' }
]

export const predictions = [
  { id: 'P-00124', object: 'МК-6.7.8', type: 'Подтопление',     horizon: '24ч', probability: 92, model: 'FloodNet v3.2', verified: false },
  { id: 'P-00123', object: 'МК-2.2.2', type: 'Пожар',           horizon: '12ч', probability: 78, model: 'FirePredict v2.1', verified: false },
  { id: 'P-00122', object: 'МК-1.1.1', type: 'Несанк. доступ',  horizon: '48ч', probability: 65, model: 'AccessGuard v1.8', verified: true },
  { id: 'P-00121', object: 'МК-4.3.2', type: 'Отказ датчика',   horizon: '72ч', probability: 45, model: 'SensorHealth v4.0', verified: true },
  { id: 'P-00120', object: 'МК-8.5.1', type: 'Газовая утечка',  horizon: '6ч',  probability: 88, model: 'GasLeak v2.4', verified: true }
]

export const equipment = [
  { id: 'EQ-001', name: 'Датчик температуры', location: 'МК-1.1.1.1.1.1', type: 'temperature', status: 'online', lastCheck: '19.09.2026 14:30' },
  { id: 'EQ-002', name: 'Датчик задымления',  location: 'МК-2.2.2.2.2.14', type: 'smoke',       status: 'online', lastCheck: '19.09.2026 14:30' },
  { id: 'EQ-003', name: 'Газоанализатор',     location: 'МК-6.7.8.2.2.189', type: 'gas',         status: 'warning', lastCheck: '19.09.2026 14:28' },
  { id: 'EQ-004', name: 'Датчик движения',    location: 'МК-4.3.2.1.5.7',   type: 'movement',    status: 'offline', lastCheck: '19.09.2026 13:15' },
  { id: 'EQ-005', name: 'Насос №3',           location: 'МК-8.5.1.3.2.9',   type: 'pump',        status: 'online', lastCheck: '19.09.2026 14:30' },
  { id: 'EQ-006', name: 'Вентилятор В-12',    location: 'МК-3.1.2.4.1.2',   type: 'fan',         status: 'maintenance', lastCheck: '19.09.2026 08:00' }
]

export const users = [
  { id: 1, name: 'Дмитрий Смирнов', email: 'd.smirnov@moskollector.ru', role: 'Диспетчер', status: 'active', lastLogin: '19.09.2026 14:20' },
  { id: 2, name: 'Анна Петрова',    email: 'a.petrova@moskollector.ru', role: 'Аналитик',  status: 'active', lastLogin: '19.09.2026 13:45' },
  { id: 3, name: 'Игорь Волков',    email: 'i.volkov@moskollector.ru',  role: 'Инженер',   status: 'suspended', lastLogin: '15.09.2026 09:10' },
  { id: 4, name: 'Елена Кузнецова', email: 'e.kuznetsova@moskollector.ru', role: 'Администратор', status: 'active', lastLogin: '19.09.2026 14:30' }
]

export const integrations = [
  { id: 1, name: 'СМВУ',          type: 'API',     status: 'connected', lastSync: '19.09.2026 14:30', endpoint: 'smvu.moskollector.internal' },
  { id: 2, name: 'ОДС Журналы',    type: 'API',     status: 'connected', lastSync: '19.09.2026 14:30', endpoint: 'ods.moskollector.internal' },
  { id: 3, name: 'Метеослужба',    type: 'REST',    status: 'connected', lastSync: '19.09.2026 14:25', endpoint: 'api.weather.mos.ru' },
  { id: 4, name: 'AD / LDAP',      type: 'LDAP',    status: 'connected', lastSync: '19.09.2026 14:00', endpoint: 'ldap.corp.moskollector.ru' },
  { id: 5, name: 'Реестр оборудования', type: 'CSV/XLSX', status: 'connected', lastSync: '19.09.2026 02:00', endpoint: 'registry.moskollector.internal' }
]

export const chartData = [
  { hour: '00:00', incidents: 3, falseAlarms: 1, predictions: 12 },
  { hour: '02:00', incidents: 2, falseAlarms: 2, predictions: 8  },
  { hour: '04:00', incidents: 1, falseAlarms: 0, predictions: 5  },
  { hour: '06:00', incidents: 4, falseAlarms: 3, predictions: 15 },
  { hour: '08:00', incidents: 7, falseAlarms: 4, predictions: 22 },
  { hour: '10:00', incidents: 9, falseAlarms: 2, predictions: 28 },
  { hour: '12:00', incidents: 11, falseAlarms: 5, predictions: 34 },
  { hour: '14:00', incidents: 8, falseAlarms: 3, predictions: 31 },
  { hour: '16:00', incidents: 6, falseAlarms: 2, predictions: 25 },
  { hour: '18:00', incidents: 5, falseAlarms: 1, predictions: 19 },
  { hour: '20:00', incidents: 4, falseAlarms: 2, predictions: 14 },
  { hour: '22:00', incidents: 3, falseAlarms: 1, predictions: 11 }
]

/** Статусы объектов на карте (коллектор / узел) */
export type MapObjectStatus = 'ok' | 'warning' | 'critical' | 'offline' | 'maintenance'

export type SensorStatus = 'online' | 'warning' | 'offline' | 'maintenance' | 'critical'

export type SensorReading = {
  label: string
  value: string
  unit: string
  /** норма / внимание / авария для подсветки */
  level?: 'ok' | 'warn' | 'alarm'
}

export type CollectorSensor = {
  id: string
  name: string
  kind: 'temperature' | 'smoke' | 'gas' | 'movement' | 'pump' | 'fan' | 'level' | 'humidity'
  status: SensorStatus
  lastCheck: string
  /** место внутри коллектора */
  place: string
  /** канал датчика (СМВУ / шина данных) */
  channel: string
  readings: SensorReading[]
}

export type MapObject = {
  id: string
  /** Тип узла: коллектор, камера, насосная… */
  type: string
  len: string
  /**
   * Устарело: цвет метки и статус в UI считаются из `sensors`
   * через `deriveCollectorStatus` (см. lib/collectorStatus.ts).
   * Поле можно не присылать из API.
   */
  status?: MapObjectStatus
  lat: number
  lng: number
  address: string
  /** краткое описание для попапа */
  description: string
  sensors: CollectorSensor[]
  /**
   * ID связанной заявки (если есть).
   * Для статуса ТО заявка предполагается всегда;
   * для остальных — если задано, в UI «Перейти к задаче».
   */
  taskId?: string | null
}

function sensorsFor(
  collectorId: string,
  items: Omit<CollectorSensor, 'id' | 'channel'>[]
): CollectorSensor[] {
  const code = collectorId.replace(/[^\d]/g, '') || '0'
  return items.map((s, i) => ({
    ...s,
    id: `${collectorId}-S${String(i + 1).padStart(2, '0')}`,
    channel: `SMVU/${code}/${s.kind}/${String(i + 1).padStart(2, '0')}`
  }))
}

/** Демо-точки по Москве: точка = коллектор/узел с датчиками внутри */
export const mapObjects: MapObject[] = [
  {
    id: 'МК-1.1.1',
    lat: 55.7558,
    lng: 37.6176,
    status: 'ok',
    type: 'Коллектор',
    len: '2.4 км',
    address: 'Центр, у Кремля',
    description: 'Магистральный коллектор центрального участка. Штатный режим.',
    sensors: sensorsFor('МК-1.1.1', [
      {
        name: 'Датчик температуры',
        kind: 'temperature',
        status: 'online',
        lastCheck: '19.09.2026 14:30',
        place: 'Камера К-12',
        readings: [
          { label: 'Температура', value: '18.4', unit: '°C', level: 'ok' },
          { label: 'Влажность', value: '62', unit: '%', level: 'ok' }
        ]
      },
      {
        name: 'Датчик уровня воды',
        kind: 'level',
        status: 'online',
        lastCheck: '19.09.2026 14:29',
        place: 'Лоток №3',
        readings: [
          { label: 'Уровень', value: '12', unit: 'см', level: 'ok' },
          { label: 'Скорость потока', value: '0.4', unit: 'м/с', level: 'ok' }
        ]
      },
      {
        name: 'Газоанализатор',
        kind: 'gas',
        status: 'online',
        lastCheck: '19.09.2026 14:28',
        place: 'Входной портал',
        readings: [
          { label: 'CH₄', value: '0.1', unit: '% НКПР', level: 'ok' },
          { label: 'CO', value: '3', unit: 'ppm', level: 'ok' }
        ]
      }
    ])
  },
  {
    id: 'МК-2.2.2',
    lat: 55.7472,
    lng: 37.7148,
    status: 'warning',
    type: 'Склад К6',
    len: '1.2 км',
    address: 'ш. Энтузиастов',
    description: 'Узел у склада К6. Повышенное задымление на участке В-2.',
    taskId: 'ZAY-2026-0142',
    sensors: sensorsFor('МК-2.2.2', [
      {
        name: 'Датчик задымления',
        kind: 'smoke',
        status: 'warning',
        lastCheck: '19.09.2026 14:18',
        place: 'Секция В-2',
        readings: [
          { label: 'Оптическая плотность', value: '0.42', unit: 'дБ/м', level: 'warn' },
          { label: 'Температура', value: '31.2', unit: '°C', level: 'warn' }
        ]
      },
      {
        name: 'Датчик температуры',
        kind: 'temperature',
        status: 'online',
        lastCheck: '19.09.2026 14:30',
        place: 'Секция А-1',
        readings: [
          { label: 'Температура', value: '22.1', unit: '°C', level: 'ok' }
        ]
      },
      {
        name: 'Датчик движения',
        kind: 'movement',
        status: 'online',
        lastCheck: '19.09.2026 14:25',
        place: 'Вход К6',
        readings: [
          { label: 'События / ч', value: '2', unit: '', level: 'ok' },
          { label: 'Последнее', value: '14:12', unit: '', level: 'ok' }
        ]
      }
    ])
  },
  {
    id: 'МК-3.1.2',
    lat: 55.7089,
    lng: 37.5864,
    status: 'ok',
    type: 'Теплотрасса',
    len: '5.1 км',
    address: 'Ленинский пр.',
    description: 'Коллектор вдоль Ленинского проспекта. Вентиляция в норме.',
    sensors: sensorsFor('МК-3.1.2', [
      {
        name: 'Вентилятор В-12',
        kind: 'fan',
        status: 'online',
        lastCheck: '19.09.2026 14:30',
        place: 'Шахта В-12',
        readings: [
          { label: 'Обороты', value: '980', unit: 'об/мин', level: 'ok' },
          { label: 'Ток', value: '14.2', unit: 'А', level: 'ok' }
        ]
      },
      {
        name: 'Датчик влажности',
        kind: 'humidity',
        status: 'online',
        lastCheck: '19.09.2026 14:27',
        place: 'Камера 12',
        readings: [
          { label: 'Влажность', value: '58', unit: '%', level: 'ok' },
          { label: 'Точка росы', value: '9.1', unit: '°C', level: 'ok' }
        ]
      }
    ])
  },
  {
    id: 'МК-4.3.2',
    lat: 55.7891,
    lng: 37.5592,
    status: 'offline',
    type: 'Вентшахта',
    len: '0.8 км',
    address: 'район Сокол',
    description: 'Вентшахта В-44. Связь с частью датчиков потеряна.',
    sensors: sensorsFor('МК-4.3.2', [
      {
        name: 'Датчик движения',
        kind: 'movement',
        status: 'offline',
        lastCheck: '19.09.2026 13:15',
        place: 'Вентшахта В-44',
        readings: [
          { label: 'Связь', value: 'нет', unit: '', level: 'alarm' }
        ]
      },
      {
        name: 'Датчик температуры',
        kind: 'temperature',
        status: 'offline',
        lastCheck: '19.09.2026 13:15',
        place: 'Вентшахта В-44',
        readings: [
          { label: 'Температура', value: '—', unit: '°C', level: 'alarm' }
        ]
      }
    ])
  },
  {
    id: 'МК-6.7.8',
    lat: 55.7644,
    lng: 37.6059,
    status: 'critical',
    type: 'Коллектор',
    len: '3.7 км',
    address: 'ул. Тверская, камера 189',
    description: 'Критический участок: риск подтопления камеры 189.',
    sensors: sensorsFor('МК-6.7.8', [
      {
        name: 'Датчик уровня воды',
        kind: 'level',
        status: 'warning',
        lastCheck: '19.09.2026 14:32',
        place: 'Камера 189',
        readings: [
          { label: 'Уровень', value: '84', unit: 'см', level: 'alarm' },
          { label: 'Прирост / ч', value: '+11', unit: 'см', level: 'alarm' }
        ]
      },
      {
        name: 'Газоанализатор',
        kind: 'gas',
        status: 'warning',
        lastCheck: '19.09.2026 14:28',
        place: 'Камера 189',
        readings: [
          { label: 'CH₄', value: '2.4', unit: '% НКПР', level: 'warn' },
          { label: 'H₂S', value: '8', unit: 'ppm', level: 'warn' }
        ]
      },
      {
        name: 'Датчик температуры',
        kind: 'temperature',
        status: 'online',
        lastCheck: '19.09.2026 14:30',
        place: 'Камера 188',
        readings: [
          { label: 'Температура', value: '16.8', unit: '°C', level: 'ok' }
        ]
      },
      {
        name: 'Насос дренажный',
        kind: 'pump',
        status: 'online',
        lastCheck: '19.09.2026 14:31',
        place: 'Приямок 189',
        readings: [
          { label: 'Режим', value: 'авто', unit: '', level: 'ok' },
          { label: 'Напор', value: '2.1', unit: 'бар', level: 'ok' }
        ]
      }
    ])
  },
  {
    id: 'МК-8.5.1',
    lat: 55.7312,
    lng: 37.6631,
    status: 'ok',
    type: 'Коллектор',
    len: '4.2 км',
    address: 'Таганский район',
    description: 'Коллектор К8-5. Оборудование в штатном режиме.',
    sensors: sensorsFor('МК-8.5.1', [
      {
        name: 'Насос №3',
        kind: 'pump',
        status: 'online',
        lastCheck: '19.09.2026 14:30',
        place: 'Насосная К8',
        readings: [
          { label: 'Расход', value: '18', unit: 'м³/ч', level: 'ok' },
          { label: 'Вибрация', value: '1.2', unit: 'мм/с', level: 'ok' }
        ]
      },
      {
        name: 'Газоанализатор',
        kind: 'gas',
        status: 'online',
        lastCheck: '19.09.2026 14:29',
        place: 'Участок 8.5',
        readings: [
          { label: 'CH₄', value: '0.0', unit: '% НКПР', level: 'ok' }
        ]
      }
    ])
  },
  {
    id: 'МК-9.2.1',
    lat: 55.6905,
    lng: 37.6218,
    status: 'maintenance',
    type: 'Насосная',
    len: '1.5 км',
    address: 'Юг, Нагатинская',
    description: 'Насосная станция на плановом ТО до 20.09.',
    taskId: 'ZAY-2026-0098',
    sensors: sensorsFor('МК-9.2.1', [
      {
        name: 'Насос №1',
        kind: 'pump',
        status: 'maintenance',
        lastCheck: '19.09.2026 08:00',
        place: 'Агрегат 1',
        readings: [
          { label: 'Режим', value: 'ТО', unit: '', level: 'ok' }
        ]
      },
      {
        name: 'Датчик уровня воды',
        kind: 'level',
        status: 'online',
        lastCheck: '19.09.2026 14:20',
        place: 'Резервуар',
        readings: [
          { label: 'Уровень', value: '2.4', unit: 'м', level: 'ok' }
        ]
      }
    ])
  }
]