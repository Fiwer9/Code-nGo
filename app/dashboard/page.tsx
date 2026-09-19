'use client'
import { AlertTriangle, Activity, Cpu, CheckCircle, TrendingUp, Flame, Droplet, UserX } from 'lucide-react'
import StatsCard from '@/components/StatsCard'
import Card from '@/components/Card'
import { incidents, chartData } from '@/lib/mockData'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'
import { useChartTheme } from '@/lib/useChartTheme'

export default function DashboardPage() {
  const chart = useChartTheme()
  const pieData = [
    { name: 'Подтопления',     value: 42, color: '#3b82f6' },
    { name: 'Пожары',          value: 28, color: '#ef4444' },
    { name: 'Несанкц. доступ', value: 18, color: '#f59e0b' },
    { name: 'Отказы датчиков', value: 12, color: '#06b6d4' }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Дашборд</h1>
        <p className="text-surface-600 mt-1">Мониторинг состояния инфраструктуры в реальном времени</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Активных инцидентов" value="7"  icon={<AlertTriangle size={22} />} trend={12} color="red" />
        <StatsCard title="Прогнозов сегодня"   value="24" icon={<Activity size={22} />}       trend={8}  color="blue" />
        <StatsCard title="Оборудование онлайн" value="98%" icon={<Cpu size={22} />}            trend={2}  color="green" />
        <StatsCard title="Решено за сутки"     value="34" icon={<CheckCircle size={22} />}    trend={15} color="cyan" />
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-900">Инциденты и прогнозы за 24 часа</h3>
            <div className="flex gap-2">
              {['1Ч', '24Ч', '7Д', '30Д'].map(p => (
                <button key={p} className="px-3 py-1 text-xs rounded-md bg-surface-200 hover:bg-surface-300 text-surface-700 transition">
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={12} />
              <YAxis stroke={chart.axis} fontSize={12} />
              <Tooltip contentStyle={chart.tooltip} />
              <Legend />
              <Line type="monotone" dataKey="incidents"    stroke="#ef4444" strokeWidth={2} name="Инциденты" dot={false} />
              <Line type="monotone" dataKey="falseAlarms" stroke="#f59e0b" strokeWidth={2} name="Ложные"    dot={false} />
              <Line type="monotone" dataKey="predictions"  stroke="#3b82f6" strokeWidth={2} name="Прогнозы"  dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Типы инцидентов</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={chart.tooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-surface-700">{d.name}</span>
                </div>
                <span className="font-semibold text-surface-900">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Последние инциденты */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900">Критические инциденты</h3>
          <Link href="/incidents" className="text-sm text-primary-400 hover:text-primary-300">Показать все →</Link>
        </div>
        <div className="space-y-3">
          {incidents.slice(0, 4).map(inc => {
            const colors: any = {
              critical: { bg: 'bg-danger/10', text: 'text-danger', icon: Flame,  label: 'КРИТИЧЕСКИЙ' },
              warning:  { bg: 'bg-warning/10', text: 'text-warning', icon: Droplet, label: 'ВНИМАНИЕ' },
              info:     { bg: 'bg-info/10', text: 'text-info', icon: UserX,   label: 'ИНФО' }
            }
            const c = colors[inc.status]
            const Icon = c.icon
            return (
              <div key={inc.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface-200/30 hover:bg-surface-200/60 transition">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <Icon size={18} className={c.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold ${c.text}`}>{c.label}</span>
                    <span className="text-xs text-surface-500">{inc.id}</span>
                  </div>
                  <div className="font-medium text-surface-900 truncate">{inc.type} · {inc.object}</div>
                  <div className="text-xs text-surface-500 truncate">{inc.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-surface-900">{inc.probability}%</div>
                  <div className="text-xs text-surface-500">{inc.date.split(' ')[1]}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}