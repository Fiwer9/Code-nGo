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