'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Map, BookOpen, BarChart3, FileText, Cpu,
  Users, Link as LinkIcon, Shield, Settings, ChevronRight, Activity, ClipboardList
} from 'lucide-react'
import clsx from 'clsx'

const mainNav = [
  { href: '/dashboard',   label: 'Дашборд',           icon: LayoutDashboard },
  { href: '/map',         label: 'Карта объектов',    icon: Map },
  { href: '/incidents',   label: 'Журнал инцидентов', icon: BookOpen },
  { href: '/predictions', label: 'Журнал прогнозов',  icon: Activity },
  { href: '/equipment',   label: 'Оборудование',      icon: Cpu },
  { href: '/requests',    label: 'Заявки',            icon: ClipboardList },
  { href: '/analytics',   label: 'Аналитика',         icon: BarChart3 },
  { href: '/reports',     label: 'Отчёты',            icon: FileText }
]

const adminNav = [
  { href: '/admin/users',        label: 'Пользователи',     icon: Users },
  { href: '/admin/integrations', label: 'Интеграции',       icon: LinkIcon },
  { href: '/admin/security',     label: 'Безопасность',     icon: Shield },
  { href: '/admin/settings',     label: 'Общие настройки',  icon: Settings }
]

export default function Sidebar() {
  const pathname = usePathname()

  const Item = ({ href, label, icon: Icon }: any) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={clsx(
          'group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
          active
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40'
            : 'text-surface-600 hover:bg-surface-200 hover:text-surface-900'
        )}
      >
        <Icon size={18} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={14} />}
      </Link>
    )
  }

  return (
    <aside className="w-64 bg-surface-100 border-r border-surface-200 h-screen sticky top-0 hidden md:flex md:flex-col">
      <div className="p-5 border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
            <Activity size={22} className="text-white" />
          </div>
          <div className="font-bold text-surface-900">Москоллектор</div>
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto min-h-0">
        <div className="text-xs uppercase tracking-wider text-surface-500 px-3 py-2 font-semibold">Основное</div>
        {mainNav.map(Item)}

        <div className="text-xs uppercase tracking-wider text-surface-500 px-3 py-2 mt-4 font-semibold">Администратор</div>
        {adminNav.map(Item)}
      </nav>

      <div className="shrink-0 p-3 border-t border-surface-200">
        <div className="px-3 py-2.5 rounded-lg bg-surface-200/50 border border-surface-300/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-surface-700">Система активна</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
