'use client'
import { FileText, Download, Calendar, Printer, Share2 } from 'lucide-react'
import Card from '@/components/Card'
import { useState } from 'react'

export default function ReportsPage() {
  const [period, setPeriod] = useState('month')

  const reports = [
    { id: 1, title: 'Отчёт по инцидентам за сентябрь 2026',        type: 'PDF',  size: '2.4 МБ', date: '19.09.2026' },
    { id: 2, title: 'Эффективность работы ML-моделей Q3 2026',     type: 'PDF',  size: '5.1 МБ', date: '15.09.2026' },
    { id: 3, title: 'Статистика отказов оборудования',             type: 'XLSX', size: '1.8 МБ', date: '12.09.2026' },
    { id: 4, title: 'Отчёт по ложным срабатываниям',               type: 'PDF',  size: '3.2 МБ', date: '10.09.2026' },
    { id: 5, title: 'Журнал проведённых ТО/ППР',                    type: 'XLSX', size: '4.5 МБ', date: '08.09.2026' },
    { id: 6, title: 'Аналитика по типам инцидентов',                type: 'PDF',  size: '2.9 МБ', date: '05.09.2026' }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Отчёты</h1>
          <p className="text-surface-600 mt-1">Генерация и скачивание аналитических отчётов</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Доступные отчёты</h3>
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface-200/30 hover:bg-surface-200/60 transition">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${r.type === 'PDF' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-surface-900 truncate">{r.title}</div>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {r.type} · {r.size} · {r.date}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 rounded hover:bg-surface-300 text-surface-600 transition">
                    <Printer size={14} />
                  </button>
                  <button className="p-2 rounded hover:bg-surface-300 text-surface-600 transition">
                    <Share2 size={14} />
                  </button>
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1.5 transition">
                    <Download size={14} /> Скачать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Новый отчёт</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-700 mb-1.5">Тип отчёта</label>
              <select className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                <option>Инциденты</option>
                <option>Прогнозы</option>
                <option>Оборудование</option>
                <option>Производительность моделей</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-surface-700 mb-1.5">Период</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                <option value="day">Сегодня</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="quarter">Квартал</option>
                <option value="year">Год</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-surface-700 mb-1.5">Формат</label>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-primary-600 text-white py-2 rounded-lg text-sm">PDF</button>
                <button className="bg-surface-200 hover:bg-surface-300 text-surface-900 py-2 rounded-lg text-sm">XLSX</button>
              </div>
            </div>
            <button className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition">
              Сгенерировать отчёт
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}