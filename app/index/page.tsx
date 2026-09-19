import { ArrowRight, Shield, Zap, TrendingUp, Activity } from 'lucide-react'
import Card from '@/components/Card'
import Link from 'next/link'

export default function IndexPage() {
  const features = [
    { icon: Activity,  title: 'Предиктивная аналитика', desc: 'Прогноз инцидентов за 24+ часа', color: 'text-primary-400' },
    { icon: Shield,    title: 'Повышение безопасности', desc: '825 км коллекторов под контролем', color: 'text-success' },
    { icon: Zap,       title: 'Снижение ложных тревог', desc: 'ИИ-фильтрация сработок', color: 'text-warning' },
    { icon: TrendingUp, title: 'Оптимизация ТО/ППР',     desc: 'Обслуживание по фактическому состоянию', color: 'text-info' }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900/40 via-surface-100 to-surface-100 border border-primary-900/30 p-10 mb-8">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-primary-900/30 border border-primary-800/50 rounded-full px-3 py-1 mb-4">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-primary-300">Система работает в штатном режиме</span>
          </div>
          <h1 className="text-4xl font-bold text-surface-900 mb-3">Добро пожаловать в MosKollector AI</h1>
          <p className="text-lg text-surface-600 max-w-2xl mb-6">
            Интеллектуальная платформа прогнозирования инцидентов для АО «Москоллектор».
            Предсказываем отказы, пожары и подтопления до их возникновения.
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-lg shadow-primary-900/40">
              Перейти в дашборд <ArrowRight size={16} />
            </Link>
            <Link href="/analytics" className="inline-flex items-center gap-2 bg-surface-200 hover:bg-surface-300 text-surface-900 px-5 py-2.5 rounded-lg font-semibold transition">
              Аналитика
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {features.map((f, i) => (
          <Card key={i} hover>
            <f.icon size={28} className={f.color} />
            <h3 className="font-semibold text-surface-900 mt-3 mb-1">{f.title}</h3>
            <p className="text-sm text-surface-600">{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* Метрики */}
      <Card className="gradient-border">
        <h2 className="text-xl font-bold text-surface-900 mb-6">Инфраструктура под контролем</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Длина коллекторов',   value: '825 км' },
            { label: 'Кабели связи',         value: '19 700 км' },
            { label: 'Силовые кабели',       value: '8 300 км' },
            { label: 'Тепловые сети',        value: '1 900 км' }
          ].map((m, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-surface-900">{m.value}</div>
              <div className="text-sm text-surface-600 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}