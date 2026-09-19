'use client'
import { TrendingUp, Target, Clock, Brain } from 'lucide-react'
import Card from '@/components/Card'
import StatsCard from '@/components/StatsCard'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts'
import { chartData } from '@/lib/mockData'
import { useChartTheme } from '@/lib/useChartTheme'

const monthlyData = [
  { month: 'Янв', accuracy: 82, precision: 78, recall: 85 },
  { month: 'Фев', accuracy: 84, precision: 80, recall: 87 },
  { month: 'Мар', accuracy: 86, precision: 83, recall: 88 },
  { month: 'Апр', accuracy: 87, precision: 85, recall: 89 },
  { month: 'Май', accuracy: 89, precision: 87, recall: 90 },
  { month: 'Июн', accuracy: 90, precision: 89, recall: 91 },
  { month: 'Июл', accuracy: 91, precision: 90, recall: 92 },
  { month: 'Авг', accuracy: 92, precision: 91, recall: 93 },
  { month: 'Сен', accuracy: 93, precision: 92, recall: 94 }
]

const modelPerf = [
  { name: 'FloodNet v3.2',    accuracy: 94.2, f1: 91.8 },
  { name: 'FirePredict v2.1', accuracy: 89.7, f1: 87.3 },
  { name: 'AccessGuard v1.8', accuracy: 92.1, f1: 90.5 },
  { name: 'SensorHealth v4.0', accuracy: 88.9, f1: 86.2 },
  { name: 'GasLeak v2.4',     accuracy: 91.5, f1: 89.7 }
]

export default function AnalyticsPage() {
  const chart = useChartTheme()
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Аналитика</h1>
        <p className="text-surface-600 mt-1">Статистика и качество работы ML-моделей</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Точность (Accuracy)" value="93.4%" icon={<Target size={22} />}    trend={4.2} color="green" />
        <StatsCard title="Precision"           value="92.1%" icon={<TrendingUp size={22} />} trend={3.8} color="blue" />
        <StatsCard title="Recall"              value="94.2%" icon={<Brain size={22} />}       trend={5.1} color="cyan" />
        <StatsCard title="Avg Inference"       value="4.2с"  icon={<Clock size={22} />}      trend={-12} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Динамика метрик по месяцам</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="month" stroke={chart.axis} fontSize={12} />
              <YAxis stroke={chart.axis} fontSize={12} />
              <Tooltip contentStyle={chart.tooltip} />
              <Legend />
              <Area type="monotone" dataKey="accuracy"  stroke="#3b82f6" fill="url(#g1)" name="Accuracy" />
              <Area type="monotone" dataKey="precision" stroke="#10b981" fill="url(#g2)" name="Precision" />
              <Area type="monotone" dataKey="recall"    stroke="#06b6d4" fill="url(#g3)" name="Recall" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Производительность моделей</h3>
          <div className="space-y-4">
            {modelPerf.map(m => (
              <div key={m.name}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm text-surface-900">{m.name}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-surface-500">Acc: <span className="font-mono text-primary-400">{m.accuracy}%</span></span>
                    <span className="text-surface-500">F1: <span className="font-mono text-success">{m.f1}%</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600" style={{ width: `${m.accuracy}%` }} />
                  </div>
                  <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-success to-emerald-600" style={{ width: `${m.f1}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Инциденты по часам (реальное время)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="hour" stroke={chart.axis} fontSize={12} />
            <YAxis stroke={chart.axis} fontSize={12} />
            <Tooltip contentStyle={chart.tooltip} />
            <Legend />
            <Bar dataKey="incidents" fill="#ef4444" radius={[4,4,0,0]} name="Инциденты" />
            <Bar dataKey="falseAlarms" fill="#f59e0b" radius={[4,4,0,0]} name="Ложные" />
            <Bar dataKey="predictions" fill="#3b82f6" radius={[4,4,0,0]} name="Прогнозы" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}