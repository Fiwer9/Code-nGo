'use client'
import { useState } from 'react'
import { Activity, Lock, User as UserIcon, AlertCircle } from 'lucide-react'
import { useAuth, ApiError } from '@/components/AuthProvider'

export default function LoginPage() {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login({ identifier: identifier.trim(), password })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Не удалось войти'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-100 to-primary-900/20" />
      <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-success/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-2xl shadow-primary-900/50 mb-4">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-900">Москоллектор</h1>
          <p className="text-surface-600 mt-1">Сервис прогнозирования инцидентов</p>
        </div>

        <div className="bg-surface-100 border border-surface-200 rounded-2xl p-8 shadow-2xl shadow-black/50 animate-fadeIn">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-surface-900">Вход в систему</h2>
            <p className="text-sm text-surface-600 mt-1">Имя пользователя и пароль</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2 text-sm text-danger">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Имя пользователя</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Имя пользователя"
                  autoComplete="username"
                  required
                  minLength={3}
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
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-900/50 transition disabled:opacity-50"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
