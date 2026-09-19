'use client'
import { useState } from 'react'
import { Settings, Brain, Database, Bell, Save, RotateCcw, Play, Zap } from 'lucide-react'
import Card from '@/components/Card'

export default function SettingsPage() {
  const [tab, setTab] = useState('models')
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const tabs = [
    { id: 'models',      label: 'ML-модели',   icon: Brain },
    { id: 'data',        label: 'Данные',      icon: Database },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'system',      label: 'Система',     icon: Settings }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Общие настройки</h1>
          <p className="text-surface-600 mt-1">Параметры ML-моделей, данных и системы</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-200 hover:bg-surface-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <RotateCcw size={16} /> Сбросить
          </button>
          <button onClick={save} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <Save size={16} /> Сохранить
          </button>
        </div>
      </div>

      {saved && (
        <div className="bg-success/20 border border-success/30 text-success px-4 py-2 rounded-lg text-sm animate-fadeIn">
          ✓ Настройки сохранены
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Табы */}
        <Card className="lg:col-span-1 h-fit">
          <div className="space-y-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  tab === t.id ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-200'
                }`}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Контент */}
        <div className="lg:col-span-3 space-y-4">
          {tab === 'models' && (
            <Card>
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Параметры ML-моделей</h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Горизонт прогнозирования
                  </label>
                  <select className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                    <option>24 часа</option>
                    <option>48 часов</option>
                    <option>72 часа</option>
                    <option>7 дней</option>
                  </select>
                  <div className="text-xs text-surface-500 mt-1">Минимальное время предсказания инцидента</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Максимальное время inference (сек)
                  </label>
                  <input type="number" defaultValue={300} className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Целевой Precision (%)
                  </label>
                  <input type="range" min={50} max={99} defaultValue={90} className="w-full" />
                  <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>50%</span><span>Текущий: 90%</span><span>99%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Целевой Recall (%)
                  </label>
                  <input type="range" min={50} max={99} defaultValue={92} className="w-full" />
                  <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>50%</span><span>Текущий: 92%</span><span>99%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-200">
                  <h4 className="font-medium text-surface-900 mb-3">Автодообучение моделей</h4>
                  <div className="space-y-2">
                    {['FloodNet v3.2', 'FirePredict v2.1', 'AccessGuard v1.8', 'SensorHealth v4.0', 'GasLeak v2.4'].map(m => (
                      <div key={m} className="flex items-center justify-between p-2.5 bg-surface-200/30 rounded-lg">
                        <span className="text-sm text-surface-900">{m}</span>
                        <div className="flex items-center gap-2">
                          <button className="text-xs bg-surface-200 hover:bg-surface-300 px-3 py-1 rounded flex items-center gap-1">
                            <Play size={12} /> Обучить
                          </button>
                          <button className="relative w-10 h-5 bg-success rounded-full">
                            <span className="absolute top-0.5 left-5 w-4 h-4 bg-white rounded-full" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {tab === 'data' && (
            <Card>
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Настройки данных</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-200/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database size={18} className="text-primary-400" />
                    <div>
                      <div className="font-medium text-surface-900">Обфускация данных</div>
                      <div className="text-xs text-surface-500">Обезличивание при передаче</div>
                    </div>
                  </div>
                  <button className="relative w-11 h-6 bg-success rounded-full">
                    <span className="absolute top-0.5 left-5 w-5 h-5 bg-white rounded-full" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-200/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-warning" />
                    <div>
                      <div className="font-medium text-surface-900">Потоковая обработка</div>
                      <div className="text-xs text-surface-500">Near real-time из СМВУ</div>
                    </div>
                  </div>
                  <button className="relative w-11 h-6 bg-success rounded-full">
                    <span className="absolute top-0.5 left-5 w-5 h-5 bg-white rounded-full" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Максимальная задержка обработки (сек)
                  </label>
                  <input type="number" defaultValue={300} className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Глубина исторических данных
                  </label>
                  <select className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                    <option>12 лет (как в ТЗ)</option>
                    <option>5 лет</option>
                    <option>10 лет</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    СУБД
                  </label>
                  <div className="p-3 bg-surface-200/30 rounded-lg">
                    <div className="font-mono text-sm text-surface-900">PostgreSQL 15.4</div>
                    <div className="text-xs text-surface-500 mt-1">Хост: db.moskollector.internal:5432</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Каналы уведомлений</h3>
              <div className="space-y-3">
                {['Email', 'SMS', 'Push-уведомления', 'Telegram Bot', 'Внутренний чат'].map(ch => (
                  <div key={ch} className="flex items-center justify-between p-3 bg-surface-200/30 rounded-lg">
                    <span className="font-medium text-surface-900">{ch}</span>
                    <button className="relative w-11 h-6 bg-success rounded-full">
                      <span className="absolute top-0.5 left-5 w-5 h-5 bg-white rounded-full" />
                    </button>
                  </div>
                ))}
              </div>

              <h4 className="font-medium text-surface-900 mt-6 mb-3">Пороги уведомлений</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-surface-700 mb-1">Критический инцидент (вероятность)</label>
                  <input type="number" defaultValue={80} className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-surface-700 mb-1">Внимание (вероятность)</label>
                  <input type="number" defaultValue={60} className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </Card>
          )}

          {tab === 'system' && (
            <Card>
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Системные параметры</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Название системы</label>
                  <input defaultValue="Москоллектор AI" className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Таймаут сессии (минут)</label>
                  <input type="number" defaultValue={30} className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Язык по умолчанию</label>
                  <select className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                    <option>Русский</option>
                    <option>English</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-surface-200">
                  <div className="text-xs text-surface-500 space-y-1">
                    <div>Версия: 2.1.0 (build 2026.09.19)</div>
                    <div>Лицензия: Enterprise · АО «Москоллектор»</div>
                    <div>Соответствие: 149-ФЗ, 152-ФЗ, ГОСТ 34</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}