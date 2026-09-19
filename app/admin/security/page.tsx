'use client'
import { Shield, Lock, Key, AlertTriangle, CheckCircle2, Activity } from 'lucide-react'
import Card from '@/components/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const securityEvents = [
  { time: '14:32', type: 'login',    user: 'd.smirnov',  status: 'success', ip: '10.1.2.45' },
  { time: '14:28', type: 'failed',   user: 'unknown',     status: 'failed',  ip: '95.167.12.34' },
  { time: '14:15', type: '2fa',      user: 'a.petrova',   status: 'success', ip: '10.1.2.78' },
  { time: '14:02', type: 'password', user: 'i.volkov',    status: 'success', ip: '10.1.3.12' },
  { time: '13:45', type: 'failed',   user: 'admin',       status: 'failed',  ip: '185.22.44.11' },
  { time: '13:20', type: 'rbac',     user: 'e.kuznetsova', status: 'success', ip: '10.1.1.5' }
]

const attemptsData = [
  { day: 'Пн', success: 245, failed: 12 },
  { day: 'Вт', success: 267, failed: 18 },
  { day: 'Ср', success: 234, failed: 8 },
  { day: 'Чт', success: 289, failed: 22 },
  { day: 'Пт', success: 312, failed: 15 },
  { day: 'Сб', success: 178, failed: 5 },
  { day: 'Вс', success: 145, failed: 3 }
]

export default function SecurityPage() {
  const policies = [
    { name: 'TLS 1.2+',                 enabled: true,  desc: 'Шифрование передачи данных' },
    { name: 'LDAP/AD Аутентификация',   enabled: true,  desc: 'Корпоративная служба каталогов' },
    { name: 'RBAC (ролевая модель)',     enabled: true,  desc: 'Разграничение прав доступа' },
    { name: 'Двухфакторная аутентификация', enabled: true, desc: '2FA через SMS / TOTP' },
    { name: 'Журналирование действий',   enabled: true,  desc: 'Полный аудит-лог' },
    { name: 'Автоматический logout',     enabled: true,  desc: 'После 30 мин простоя' },
    { name: 'Блокировка после 5 неудач', enabled: true,  desc: 'Защита от брутфорса' }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Безопасность</h1>
        <p className="text-surface-600 mt-1">Политики, аутентификация, аудит</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Shield size={18} className="text-success" />
            </div>
            <div>
              <div className="text-xs text-surface-600">TLS</div>
              <div className="text-xl font-bold text-surface-900">v1.3</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-900/30 flex items-center justify-center">
              <Lock size={18} className="text-primary-400" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Активных сессий</div>
              <div className="text-xl font-bold text-surface-900">47</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-warning" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Попыток за 24ч</div>
              <div className="text-xl font-bold text-surface-900">83</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Key size={18} className="text-info" />
            </div>
            <div>
              <div className="text-xs text-surface-600">2FA пользователей</div>
              <div className="text-xl font-bold text-surface-900">98%</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Попытки входа по дням</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={attemptsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }} />
              <Bar dataKey="success" fill="#10b981" radius={[4,4,0,0]} name="Успешные" />
              <Bar dataKey="failed"  fill="#ef4444" radius={[4,4,0,0]} name="Неудачные" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">События безопасности</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {securityEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-surface-200/40 text-sm">
                <div className={`w-2 h-2 rounded-full ${e.status === 'success' ? 'bg-success' : 'bg-danger'}`} />
                <span className="font-mono text-xs text-surface-500">{e.time}</span>
                <span className="text-surface-900 flex-1 truncate">{e.user}</span>
                <span className="text-xs text-surface-500 font-mono">{e.type}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Политики безопасности</h3>
        <div className="space-y-2">
          {policies.map(p => (
            <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-200/30">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${p.enabled ? 'bg-success/10' : 'bg-surface-300'} flex items-center justify-center`}>
                  {p.enabled ? <CheckCircle2 size={18} className="text-success" /> : <Shield size={18} className="text-surface-500" />}
                </div>
                <div>
                  <div className="font-medium text-surface-900">{p.name}</div>
                  <div className="text-xs text-surface-500">{p.desc}</div>
                </div>
              </div>
              <button className={`relative w-11 h-6 rounded-full transition ${p.enabled ? 'bg-success' : 'bg-surface-400'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${p.enabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}