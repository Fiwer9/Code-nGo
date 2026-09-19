import { ReactNode } from 'react'
import Card from './Card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  title: string
  value: string | number
  icon: ReactNode
  trend?: number
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'cyan'
}

const colors = {
  blue:   'bg-primary-900/30 text-primary-400',
  green:  'bg-success/10 text-success',
  red:    'bg-danger/10 text-danger',
  yellow: 'bg-warning/10 text-warning',
  cyan:   'bg-info/10 text-info'
}

export default function StatsCard({ title, value, icon, trend, color = 'blue' }: Props) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-3 rounded-lg', colors[color])}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-success' : 'text-danger')}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-surface-600 text-sm mb-1">{title}</div>
      <div className="text-3xl font-bold text-surface-900">{value}</div>
    </Card>
  )
}