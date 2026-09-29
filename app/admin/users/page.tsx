'use client'
import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Shield, UserCheck, UserX, Search, AlertCircle, Loader2 } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import { useAuth } from '@/components/AuthProvider'
import { ApiError } from '@/lib/api/types'
import type { Role, User } from '@/lib/api/types'
import { assignRoles, createUser, listRoles } from '@/lib/api/users'

type FormState = {
  login: string
  email: string
  password: string
  surname: string
  name: string
  middle_name: string
  jobtitle: string
  mobile_number: string
  roleId: string
}

const emptyForm = (): FormState => ({
  login: '',
  email: '',
  password: '',
  surname: '',
  name: '',
  middle_name: '',
  jobtitle: '',
  mobile_number: '',
  roleId: ''
})

function fullName(u: User) {
  return [u.surname, u.name, u.middle_name].filter(Boolean).join(' ')
}

function roleNames(u: User) {
  return u.roles?.map((r) => r.name).join(', ') || '—'
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const roleList = await listRoles()
      setRoles(roleList)
      // GET /users пока нет в API — показываем текущего пользователя
      // и тех, кого создали в этой сессии (локальный список).
      setUsers((prev) => {
        const map = new Map<number, User>()
        if (me) map.set(me.id, me)
        for (const u of prev) map.set(u.id, u)
        return Array.from(map.values())
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (me) {
      setUsers((prev) => {
        if (prev.some((u) => u.id === me.id)) {
          return prev.map((u) => (u.id === me.id ? me : u))
        }
        return [me, ...prev]
      })
    }
  }, [me])

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      fullName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.login.toLowerCase().includes(q) ||
      roleNames(u).toLowerCase().includes(q) ||
      u.jobtitle.toLowerCase().includes(q)
    )
  })

  const activeCount = users.filter((u) => u.is_active).length
  const blockedCount = users.filter((u) => !u.is_active).length

  const openModal = () => {
    setForm({
      ...emptyForm(),
      roleId: roles[0] ? String(roles[0].id) : ''
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const created = await createUser({
        login: form.login.trim(),
        email: form.email.trim(),
        password: form.password,
        surname: form.surname.trim(),
        name: form.name.trim(),
        middle_name: form.middle_name.trim() || null,
        jobtitle: form.jobtitle.trim(),
        mobile_number: form.mobile_number.trim() || null,
        gender: 'unspecified'
      })

      let finalUser = created
      if (form.roleId) {
        finalUser = await assignRoles(created.id, { role_ids: [Number(form.roleId)] })
      }

      setUsers((prev) => {
        const rest = prev.filter((u) => u.id !== finalUser.id)
        return [finalUser, ...rest]
      })
      setShowModal(false)
      setForm(emptyForm())
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось создать пользователя')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Пользователи</h1>
          <p className="text-surface-600 mt-1">
            Управление аккаунтами и ролями через API
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <UserPlus size={16} /> Новый пользователь
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2 text-sm text-danger">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="rounded-lg border border-surface-300/50 bg-surface-200/40 px-4 py-3 text-sm text-surface-600">
        Список всех пользователей (GET) пока не реализован на бэке — здесь отображаются
        текущий аккаунт и пользователи, созданные в этой сессии.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-900/30 flex items-center justify-center">
              <Shield size={18} className="text-primary-400" />
            </div>
            <div>
              <div className="text-xs text-surface-600">В списке</div>
              <div className="text-2xl font-bold text-surface-900">{users.length}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <UserCheck size={18} className="text-success" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Активных</div>
              <div className="text-2xl font-bold text-surface-900">{activeCount}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
              <UserX size={18} className="text-danger" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Неактивных</div>
              <div className="text-2xl font-bold text-surface-900">{blockedCount}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Shield size={18} className="text-info" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Ролей в системе</div>
              <div className="text-2xl font-bold text-surface-900">{roles.length}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени, email, логину, роли..."
              className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-9 pr-4 py-2 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-surface-600 text-sm">
            <Loader2 size={16} className="animate-spin" /> Загрузка…
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={[
              {
                key: 'name', header: 'Пользователь', render: (r: User) => (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-semibold">
                      {(r.name?.[0] || '') + (r.surname?.[0] || '')}
                    </div>
                    <div>
                      <div className="font-medium text-surface-900">{fullName(r)}</div>
                      <div className="text-xs text-surface-500">{r.email} · @{r.login}</div>
                    </div>
                  </div>
                )
              },
              { key: 'jobtitle', header: 'Должность' },
              {
                key: 'roles', header: 'Роль', render: (r: User) => roleNames(r)
              },
              {
                key: 'status', header: 'Статус', render: (r: User) => (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.is_active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {r.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                )
              },
              {
                key: 'created_at',
                header: 'Создан',
                render: (r: User) => new Date(r.created_at).toLocaleString('ru-RU')
              }
            ]}
          />
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Роли</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-lg border border-surface-300/40 bg-surface-200/30 p-3">
              <div className="font-medium text-surface-900">{role.name}</div>
              <div className="text-xs text-surface-500 mt-1">{role.description || '—'}</div>
              <div className="text-xs text-surface-600 mt-2">
                Прав: {role.permissions?.length || 0}
              </div>
            </div>
          ))}
          {!loading && roles.length === 0 && (
            <div className="text-sm text-surface-500">Роли не загружены</div>
          )}
        </div>
      </Card>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="bg-surface-100 border border-surface-200 rounded-2xl p-6 w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-surface-900 mb-4">Новый пользователь</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {formError && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2 text-sm text-danger">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Фамилия"
                  value={form.surname}
                  onChange={e => setForm({ ...form, surname: e.target.value })}
                  className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  required
                  placeholder="Имя"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <input
                placeholder="Отчество (необязательно)"
                value={form.middle_name}
                onChange={e => setForm({ ...form, middle_name: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                minLength={3}
                placeholder="Логин"
                value={form.login}
                onChange={e => setForm({ ...form, login: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                type="password"
                minLength={10}
                placeholder="Пароль (мин. 10 символов)"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Должность"
                value={form.jobtitle}
                onChange={e => setForm({ ...form, jobtitle: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Телефон (необязательно)"
                value={form.mobile_number}
                onChange={e => setForm({ ...form, mobile_number: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={form.roleId}
                onChange={e => setForm({ ...form, roleId: e.target.value })}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Без роли</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-surface-200 hover:bg-surface-300 py-2 rounded-lg text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {saving ? 'Создание…' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
