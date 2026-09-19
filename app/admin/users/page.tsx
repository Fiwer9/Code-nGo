'use client'
import { useState } from 'react'
import { UserPlus, Shield, UserCheck, UserX, Search, MoreVertical } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import { users } from '@/lib/mockData'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const statusLabels: any = {
    active:    { label: 'Активен',     color: 'bg-success/20 text-success' },
    suspended: { label: 'Заблокирован', color: 'bg-danger/20 text-danger' }
  }

  const filtered = users.filter(u =>
    !search || u.name.includes(search) || u.email.includes(search) || u.role.includes(search)
  )

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Пользователи</h1>
          <p className="text-surface-600 mt-1">Управление аккаунтами и ролями (AD/LDAP)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <UserPlus size={16} /> Новый пользователь
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-900/30 flex items-center justify-center">
              <Shield size={18} className="text-primary-400" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Всего</div>
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
              <div className="text-2xl font-bold text-surface-900">{users.filter(u => u.status === 'active').length}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
              <UserX size={18} className="text-danger" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Заблокированных</div>
              <div className="text-2xl font-bold text-surface-900">{users.filter(u => u.status === 'suspended').length}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Shield size={18} className="text-info" />
            </div>
            <div>
              <div className="text-xs text-surface-600">Администраторов</div>
              <div className="text-2xl font-bold text-surface-900">
                {users.filter(u => u.role === 'Администратор').length}
              </div>
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
              placeholder="Поиск по имени, email, роли..."
              className="w-full bg-surface-200 border border-surface-300 rounded-lg pl-9 pr-4 py-2 text-sm"
            />
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={[
            {
              key: 'name', header: 'Пользователь', render: (r) => (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-semibold">
                    {r.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-surface-900">{r.name}</div>
                    <div className="text-xs text-surface-500">{r.email}</div>
                  </div>
                </div>
              )
            },
            { key: 'role', header: 'Роль' },
            {
              key: 'status', header: 'Статус', render: (r) => {
                const s = statusLabels[r.status]
                return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
              }
            },
            { key: 'lastLogin', header: 'Последний вход' },
            {
              key: 'actions', header: '', render: () => (
                <div className="flex gap-1 justify-end">
                  <button className="p-1.5 rounded hover:bg-surface-200 text-surface-600">
                    <MoreVertical size={14} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-surface-100 border border-surface-200 rounded-2xl p-6 w-full max-w-md animate-fadeIn" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-surface-900 mb-4">Новый пользователь</h3>
            <div className="space-y-4">
              <input placeholder="ФИО" className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email (AD)" className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm" />
              <select className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                <option>Диспетчер</option>
                <option>Аналитик</option>
                <option>Инженер</option>
                <option>Администратор</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-surface-200 hover:bg-surface-300 py-2 rounded-lg text-sm">Отмена</button>
                <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm">Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}