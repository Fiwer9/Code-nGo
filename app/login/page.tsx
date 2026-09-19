'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('d.smirnov@moskollector.ru')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (email && password.length >= 4) {
        router.push('/dashboard')
      } else {
        setError('Неверный email или пароль')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Фоновый градиент */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-100 to-primary-900/20" />
      <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-success/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-2xl shadow-primary-900/50 mb-4">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-900">Москоллектор</h1>
          <p className="text-surface-600 mt-1">Сервис прогнозирования инцидентов</p>
        </div>

        {/* Форма */}
        <div className="bg-surface-100 border border-surface-200 rounded-2xl p-8 shadow-2xl shadow-black/50 animate-fadeIn">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-surface-900">Вход в систему</h2>
            <p className="text-sm text-surface-600 mt-1">Используйте корпоративный аккаунт AD/LDAP</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2 text-sm text-danger">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="user@moskollector.ru"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-surface-300 bg-surface-200" />
                <span className="text-surface-600">Запомнить</span>
              </label>
              <Link href="#" className="text-primary-400 hover:text-primary-300">Забыли пароль?</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-900/50 transition disabled:opacity-50"
            >
              {loading ? 'Вход...' : 'Войти через AD/LDAP'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-200 flex items-center justify-center gap-2 text-xs text-surface-500">
            <ShieldCheck size={14} />
            <span>Защищено TLS 1.2+ · RBAC · 2FA</span>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-surface-500">
          © 2026 АО «Москоллектор» · Версия 2.1.0
        </div>
      </div>
    </div>
  )
}