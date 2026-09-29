'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  User,
  Mail,
  Briefcase,
  Phone,
  Shield,
  Loader2,
  AlertCircle,
  BadgeCheck
} from 'lucide-react'
import Card from '@/components/Card'
import { fetchMe } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/types'
import type { User as ApiUser } from '@/lib/api/types'
import { roleDisplayName, userRolesLabel } from '@/lib/roles'
import { useAuth } from '@/components/AuthProvider'

const genderRu: Record<string, string> = {
  male: 'Мужской',
  female: 'Женский',
  unspecified: 'Не указан'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || '—'
  return d.toLocaleString('ru-RU')
}

function fullName(u: ApiUser) {
  return [u.surname, u.name, u.middle_name].filter(Boolean).join(' ')
}

export default function ProfilePage() {
  const { user: sessionUser } = useAuth()
  const [profile, setProfile] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const me = await fetchMe()
      setProfile(me)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить профиль')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const u = profile || sessionUser

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Профиль</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && !u ? (
        <div className="py-20 flex flex-col items-center gap-2 text-sm text-surface-600">
          <Loader2 className="animate-spin" size={22} /> Загрузка профиля…
        </div>
      ) : u ? (
        <>
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {(u.name?.[0] || '').toUpperCase()}
                {(u.surname?.[0] || '').toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-surface-900 truncate">{fullName(u)}</h2>
                <div className="text-sm text-surface-600 mt-0.5 font-mono">@{u.login}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      u.is_active
                        ? 'bg-success/15 text-success'
                        : 'bg-danger/15 text-danger'
                    }`}
                  >
                    <BadgeCheck size={12} />
                    {u.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-surface-200 text-surface-700">
                    <Shield size={12} />
                    {userRolesLabel(u) || 'Без ролей'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Личные данные</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Field icon={User} label="ФИО" value={fullName(u)} />
              <Field icon={User} label="Логин" value={u.login} mono />
              <Field icon={Mail} label="Email" value={u.email} />
              <Field icon={Briefcase} label="Должность" value={u.jobtitle || '—'} />
              <Field
                icon={Phone}
                label="Телефон"
                value={u.mobile_number || '—'}
              />
              <Field
                icon={User}
                label="Пол"
                value={genderRu[u.gender] || u.gender || '—'}
              />
              <Field
                icon={Shield}
                label="2FA"
                value={u.two_factor_enabled ? 'Включена' : 'Выключена'}
              />
              <Field icon={User} label="ID" value={String(u.id)} mono />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Роли и права</h3>
            {u.roles?.length ? (
              <div className="space-y-3">
                {u.roles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-lg border border-surface-200 bg-surface-50/50 px-3 py-3"
                  >
                    <div className="font-medium text-surface-900">
                      {roleDisplayName(role)}
                      <span className="text-xs text-surface-500 font-normal ml-2 font-mono">
                        #{role.id} · {role.name}
                      </span>
                    </div>
                    {role.description && (
                      <div className="text-xs text-surface-600 mt-1">{role.description}</div>
                    )}
                    {role.permissions?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {role.permissions.map((p) => (
                          <span
                            key={p.id}
                            className="text-[11px] px-2 py-0.5 rounded bg-surface-200 text-surface-700 font-mono"
                            title={p.description || undefined}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-surface-500">Роли не назначены</div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Служебное</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Field label="Создан" value={formatDate(u.created_at)} />
              <Field label="Обновлён" value={formatDate(u.updated_at)} />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
  mono
}: {
  icon?: typeof User
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-surface-500 flex items-center gap-1.5 mb-0.5">
        {Icon ? <Icon size={12} /> : null}
        {label}
      </div>
      <div className={`text-surface-900 break-words ${mono ? 'font-mono text-sm' : ''}`}>
        {value}
      </div>
    </div>
  )
}
