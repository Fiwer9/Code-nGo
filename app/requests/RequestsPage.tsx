'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ClipboardList,
  Clock,
  Filter,
  Loader2,
  Plus,
  Search
} from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/DataTable'
import TicketCreateModal from '@/components/tickets/TicketCreateModal'
import { useTicketAccess } from '@/hooks/useTicketAccess'
import { ApiError } from '@/lib/api/types'
import type { StageStatsResponse, TicketDTO, TicketStage } from '@/lib/api/ticketTypes'
import { getTicketStats, listTickets } from '@/lib/api/tickets'
import {
  STAGE_BADGE,
  STAGE_ORDER,
  formatDate,
  formatDateTime,
  formatPerson,
  isOverdue,
  ticketStageLabel
} from '@/lib/ticketUi'
import { ticketRoleLabel } from '@/lib/ticketAccess'

export default function RequestsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const access = useTicketAccess()

  const initialObject = searchParams.get('object_id') || ''
  const wantCreate = searchParams.get('create') === '1'
  const warningSource = searchParams.get('warning_source') || ''
  const prefillTitle = searchParams.get('title') || ''

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<TicketStage | 'all'>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [objectId, setObjectId] = useState(initialObject)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<TicketDTO[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [stats, setStats] = useState<StageStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    setObjectId(initialObject)
  }, [initialObject])

  const canCreate = access.can('ticket.create')

  useEffect(() => {
    if (wantCreate && canCreate && !access.loading) {
      setShowCreate(true)
    }
  }, [wantCreate, canCreate, access.loading])

  const load = useCallback(async (opts?: { fresh?: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const fresh = opts?.fresh ?? true
      const [list, stageStats] = await Promise.all([
        listTickets(
          {
            page,
            page_size: 20,
            search: search.trim().length >= 2 ? search.trim() : undefined,
            stage: stageFilter === 'all' ? undefined : stageFilter,
            only_mine: onlyMine || undefined,
            overdue_only: overdueOnly || undefined,
            object_id: objectId.trim() || undefined,
            order_by: 'created_at',
            order_desc: true
          },
          { fresh }
        ),
        getTicketStats(objectId.trim() || undefined, { fresh })
      ])
      setItems(list.items || [])
      setTotal(list.total)
      setPages(list.pages)
      setStats(stageStats)
    } catch (err) {
      setItems([])
      setStats(null)
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }, [page, search, stageFilter, onlyMine, overdueOnly, objectId])

  useEffect(() => {
    const t = setTimeout(() => {
      load({ fresh: true })
    }, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  // После возврата на вкладку/страницу — актуальный список без F5
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') load({ fresh: true })
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const stageCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of stats?.by_stage || []) {
      map.set(row.stage, row.count)
    }
    return map
  }, [stats])

  const columns = [
    {
      key: 'id',
      header: '№',
      render: (r: TicketDTO) => <span className="font-mono text-surface-800">#{r.id}</span>
    },
    {
      key: 'title',
      header: 'Название',
      render: (r: TicketDTO) => (
        <div>
          <div className="font-medium text-surface-900">{r.title}</div>
          {r.warning_source && (
            <div className="text-xs text-surface-500 mt-0.5 truncate max-w-[280px]">{r.warning_source}</div>
          )}
        </div>
      )
    },
    { key: 'object_id', header: 'Объект' },
    {
      key: 'stage',
      header: 'Стадия',
      render: (r: TicketDTO) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_BADGE[r.stage]}`}>
          {r.stage_title || ticketStageLabel(r.stage)}
        </span>
      )
    },
    {
      key: 'author',
      header: 'Постановщик',
      render: (r: TicketDTO) => formatPerson(r.author)
    },
    {
      key: 'assignees',
      header: 'Исполнители',
      render: (r: TicketDTO) =>
        r.assignees?.length ? r.assignees.map(formatPerson).join(', ') : '—'
    },
    {
      key: 'due_date',
      header: 'Срок',
      render: (r: TicketDTO) => {
        const overdue = isOverdue(r.due_date, r.stage)
        return (
          <span className={overdue ? 'text-danger font-medium' : ''}>
            {formatDate(r.due_date)}
            {overdue ? ' · просрочена' : ''}
          </span>
        )
      }
    },
    {
      key: 'created_at',
      header: 'Создана',
      render: (r: TicketDTO) => formatDateTime(r.created_at)
    }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Заявки</h1>
          <p className="text-surface-600 mt-1">
            Задачи по объектам и предупреждениям · роль:{' '}
            <span className="font-medium text-surface-800">{ticketRoleLabel(access.role)}</span>
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
          >
            <Plus size={18} /> Создать заявку
          </button>
        )}
      </div>

      {access.error && (
        <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Права Ticket Service: {access.error}. UI опирается на роли сервера авторизации (
            {ticketRoleLabel(access.role)}).
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="!p-3">
          <div className="text-xs text-surface-500">Всего</div>
          <div className="text-xl font-bold text-surface-900 mt-1">{stats?.total ?? '—'}</div>
        </Card>
        {STAGE_ORDER.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              setStageFilter((prev) => (prev === code ? 'all' : code))
              setPage(1)
            }}
            className="text-left"
          >
            <Card
              className={`!p-3 ${stageFilter === code ? 'border-primary-500 ring-1 ring-primary-500/40' : ''}`}
              hover
            >
              <div className="text-xs text-surface-500 truncate">{ticketStageLabel(code)}</div>
              <div className="text-xl font-bold text-surface-900 mt-1">{stageCounts.get(code) ?? 0}</div>
            </Card>
          </button>
        ))}
        <Card className="!p-3">
          <div className="text-xs text-surface-500 flex items-center gap-1">
            <Clock size={12} /> Просрочено
          </div>
          <div className="text-xl font-bold text-danger mt-1">{stats?.overdue ?? 0}</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row gap-3 mb-4 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Поиск (от 2 символов): название, описание, объект…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm text-surface-900"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value as TicketStage | 'all')
                setPage(1)
              }}
              className="pl-9 pr-8 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm text-surface-900 appearance-none min-w-[180px]"
            >
              <option value="all">Все стадии</option>
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {ticketStageLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <input
            value={objectId}
            onChange={(e) => {
              setObjectId(e.target.value)
              setPage(1)
            }}
            placeholder="Фильтр по object_id"
            className="px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm text-surface-900 min-w-[160px]"
          />
          <label className="inline-flex items-center gap-2 text-sm text-surface-700 px-2">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => {
                setOnlyMine(e.target.checked)
                setPage(1)
              }}
            />
            Только мои
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-surface-700 px-2">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => {
                setOverdueOnly(e.target.checked)
                setPage(1)
              }}
            />
            Просроченные
          </label>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center text-surface-600 text-sm gap-2">
            <Loader2 className="animate-spin" size={24} />
            Загрузка заявок…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center text-surface-600">
            <ClipboardList size={32} className="mb-3 opacity-50" />
            <div className="font-medium text-surface-800">Заявок не найдено</div>
            <p className="text-sm mt-1 max-w-md">
              {canCreate
                ? 'Создайте заявку по предупреждению с объекта или смягчите фильтры.'
                : 'У вашей роли нет доступных заявок или нет права на создание.'}
            </p>
          </div>
        ) : (
          <DataTable
            data={items}
            columns={columns}
            onRowClick={(row) => router.push(`/requests/${row.id}`)}
          />
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-200 text-sm text-surface-600">
          <span>
            Показано {items.length} из {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md bg-surface-200 hover:bg-surface-300 disabled:opacity-40"
            >
              Назад
            </button>
            <span>
              {page} / {Math.max(pages, 1)}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md bg-surface-200 hover:bg-surface-300 disabled:opacity-40"
            >
              Вперёд
            </button>
          </div>
        </div>
      </Card>

      {!canCreate && (
        <p className="text-xs text-surface-500">
          Создание заявок доступно городскому диспетчеру. Техник работает с назначенными заявками
          (стадия и комментарии).
        </p>
      )}

      <TicketCreateModal
        open={showCreate}
        onClose={() => {
          setShowCreate(false)
          if (wantCreate) {
            const next = new URLSearchParams(searchParams.toString())
            next.delete('create')
            router.replace(`/requests${next.toString() ? `?${next}` : ''}`)
          }
        }}
        onCreated={(ticket) => {
          // Сразу показываем в таблице, не дожидаясь F5 / кэша API
          setItems((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)])
          setTotal((t) => t + 1)
          setStats((s) => (s ? { ...s, total: (s.total || 0) + 1 } : s))
          setShowCreate(false)
          void load({ fresh: true })
          router.push(`/requests/${ticket.id}`)
        }}
        defaultObjectId={objectId || initialObject}
        defaultTitle={prefillTitle}
        defaultWarningSource={warningSource}
        canPickAssignees={canCreate}
      />
    </div>
  )
}
