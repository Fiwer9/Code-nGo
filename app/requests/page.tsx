'use client'

import { ClipboardList, Construction } from 'lucide-react'
import Card from '@/components/Card'

export default function RequestsPage() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Заявки</h1>
        <p className="text-surface-600 mt-1">Задачи по объектам и обслуживанию коллекторов</p>
      </div>

      <Card className="py-16">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-surface-200 border border-surface-300 flex items-center justify-center mb-4">
            <Construction size={28} className="text-surface-500" />
          </div>
          <div className="flex items-center gap-2 text-surface-800 font-semibold text-lg mb-2">
            <ClipboardList size={20} className="text-primary-600" />
            Раздел в разработке
          </div>
          <p className="text-sm text-surface-600 leading-relaxed">
            Здесь появится журнал заявок: создание задач с карты, переход к существующим заявкам
            по объектам и статусы исполнения. Пока интерфейс готовится — кнопки на карте работают
            как заглушки.
          </p>
        </div>
      </Card>
    </div>
  )
}
