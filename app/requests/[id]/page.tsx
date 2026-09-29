'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  Save
} from 'lucide-react'
import Card from '@/components/Card'
import { useTicketAccess } from '@/hooks/useTicketAccess'
import { ApiError } from '@/lib/api/types'
import type {
  HistoryEntryDTO,
  TicketDTO,
  TicketStage,
  TicketUpdateRequest,
  UserDTO
} from '@/lib/api/ticketTypes'
import {
  addTicketComment,
  changeTicketStage,
  getTicket,
  getTicketHistory,
  listTicketUsers,
  updateTicket
} from '@/lib/api/tickets'
import type { MapObject, MapObjectStatus } from '@/lib/mockData'
import { COLLECTOR_STATUS_META, deriveCollectorStatus } from '@/lib/collectorStatus'
import { applyCollectorOperationalStatus } from '@/lib/mapObjectStatus'
import { loadMapObjects, upsertMapObject } from '@/lib/mapObjectsStore'
import {
  STAGE_BADGE,
  formatDate,
  formatDateTime,
  formatPerson,
  isOverdue,
  ticketStageLabel
} from '@/lib/ticketUi'
import { ticketRoleLabel } from '@/lib/ticketAccess'
import type { TicketRole } from '@/lib/api/ticketTypes'

const OBJECT_STATUSES: MapObjectStatus[] = ['ok', 'warning', 'critical', 'offline', 'maintenance']

export default function TicketDetailPage() {
  const params = useParams()
  const access = useTicketAccess()
  const ticketId = Number(params.id)

  const [ticket, setTicket] = useState<TicketDTO | null>(null)
  const [history, setHistory] = useState<HistoryEntryDTO[]>([])
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [warningSource, setWarningSource] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [watcherIds, setWatcherIds] = useState<string[]>([])
  const [editComment, setEditComment] = useState('')
  const [stageComment, setStageComment] = useState('')
  const [commentText, setCommentText] = useState('')
  const [mapObject, setMapObject] = useState<MapObject | null>(null)
  const [objectStatus, setObjectStatus] = useState<MapObjectStatus>('ok')
  const [objectStatusSaving, setObjectStatusSaving] = useState(false)

  const canUpdate = access.can('ticket.update')
  const canStage = access.can('ticket.stage_change') || access.role === 'ADMIN'
  const canComment = access.can('ticket.comment')
  /** Диспетчер/админ меняет статус объекта с карточки заявки */
  const canChangeObjectStatus = canUpdate || access.role === 'ADMIN' || access.role === 'MANAGER'

  const load = useCallback(async () => {
    if (!Number.isFinite(ticketId) || ticketId < 1) {
      setError('Некорректный номер заявки')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [t, h, staff] = await Promise.all([
        getTicket(ticketId),
        getTicketHistory(ticketId).catch(() => [] as HistoryEntryDTO[]),
        listTicketUsers().catch(() => [] as UserDTO[])
      ])
      setTicket(t)
      setHistory(h)
      setUsers(staff.filter((u) => u.is_active !== false))
      setTitle(t.title)
      setDescription(t.description || '')
      setDueDate(t.due_date || '')
      setWarningSource(t.warning_source || '')
      setAssigneeIds((t.assignees || []).map((a) => a.user_id))
      setWatcherIds((t.watchers || []).map((w) => w.user_id))

      const objects = loadMapObjects()
      const found = objects.find((o) => o.id === t.object_id) || null
      setMapObject(found)
      if (found) {
        setObjectStatus(deriveCollectorStatus(found.sensors))
      }
    } catch (err) {
      setTicket(null)
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить заявку')
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    load()
  }, [load])

  const nextStages = ticket?.next_stages || []

  const staffOptions = useMemo(() => users, [users])

  const toggleId = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const applyTicket = (t: TicketDTO) => {
    setTicket(t)
    setTitle(t.title)
    setDescription(t.description || '')
    setDueDate(t.due_date || '')
    setWarningSource(t.warning_source || '')
    setAssigneeIds((t.assignees || []).map((a) => a.user_id))
    setWatcherIds((t.watchers || []).map((w) => w.user_id))
  }

  const handleSave = async () => {
    if (!ticket || !canUpdate) return
    setSaving(true)
    setActionError(null)
    try {
      const payload: TicketUpdateRequest = {
        title: title.trim(),
        description,
        due_date: dueDate || null,
        warning_source: warningSource.trim() || null,
        assignee_ids: assigneeIds,
        watcher_ids: watcherIds,
        comment: editComment.trim() || null
      }
      const updated = await updateTicket(ticket.id, payload)
      applyTicket(updated)
      setEditComment('')
      const h = await getTicketHistory(ticket.id).catch(() => history)
      setHistory(h)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleStage = async (stage: TicketStage) => {
    if (!ticket || !canStage) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await changeTicketStage(ticket.id, {
        stage,
        comment: stageComment.trim() || null
      })
      applyTicket(updated)
      setStageComment('')
      const h = await getTicketHistory(ticket.id).catch(() => history)
      setHistory(h)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось сменить стадию')
    } finally {
      setSaving(false)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || !canComment || !commentText.trim()) return
    setSaving(true)
    setActionError(null)
    try {
      await addTicketComment(ticket.id, { text: commentText.trim() })
      setCommentText('')
      const [t, h] = await Promise.all([getTicket(ticket.id), getTicketHistory(ticket.id)])
      applyTicket(t)
      setHistory(h)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Не удалось добавить комментарий')
    } finally {
      setSaving(false)
    }
  }

  const handleObjectStatus = async () => {
    if (!ticket || !canChangeObjectStatus) return
    setObjectStatusSaving(true)
    setActionError(null)
    try {
      const objects = loadMapObjects()
      const current =
        objects.find((o) => o.id === ticket.object_id) ||
        mapObject ||
        ({
          id: ticket.object_id,
          type: 'Объект',
          len: '—',
          lat: 55.75,
          lng: 37.62,
          address: ticket.object_id,
          description: '',
          sensors: [
            {
              id: `${ticket.object_id}-S01`,
              name: 'Основной канал',
              kind: 'temperature',
              status: 'online',
              lastCheck: new Date().toISOString(),
              place: '—',
              channel: 'local',
              readings: []
            }
          ]
        } satisfies MapObject)

      const updated = applyCollectorOperationalStatus(current, objectStatus, ticket.id)
      upsertMapObject(updated)
      setMapObject(updated)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось обновить статус объекта')
    } finally {
      setObjectStatusSaving(false)
    }
  }

  const handleClose = async () => {
    if (!ticket || !canStage || ticket.stage === 'PROCESSED') return
    if (!confirm(`Закрыть заявку #${ticket.id}? Стадия станет «Обработана».`)) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await changeTicketStage(ticket.id, {
        stage: 'PROCESSED',
        comment: 'Заявка закрыта'
      })
      applyTicket(updated)
      const h = await getTicketHistory(ticket.id).catch(() => history)
      setHistory(h)
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось закрыть заявку. Возможно, сначала нужно пройти предыдущие стадии.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading || access.loading) {
    return (
      <div className="max-w-[1100px] mx-auto py-20 flex flex-col items-center gap-2 text-surface-600 text-sm">
        <Loader2 className="animate-spin" size={24} />
        Загрузка заявки…
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="max-w-[1100px] mx-auto space-y-4">
        <Link href="/requests" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
          <ArrowLeft size={16} /> К списку заявок
        </Link>
        <Card>
          <div className="flex items-start gap-2 text-danger text-sm">
            <AlertCircle size={18} />
            {error || 'Заявка не найдена или нет доступа'}
          </div>
        </Card>
      </div>
    )
  }

  const overdue = isOverdue(ticket.due_date, ticket.stage)

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/requests" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline mb-2">
            <ArrowLeft size={16} /> К списку заявок
          </Link>
          <h1 className="text-3xl font-bold text-surface-900">Заявка #{ticket.id}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2.5 py-1 rounded text-xs font-medium ${STAGE_BADGE[ticket.stage]}`}>
              {ticket.stage_title || ticketStageLabel(ticket.stage)}
            </span>
            <span className="text-sm text-surface-600">Объект: {ticket.object_id}</span>
            {overdue && <span className="text-xs font-medium text-danger">Просрочена</span>}
          </div>
        </div>
        {canStage && ticket.stage !== 'PROCESSED' && (
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-success/15 text-success hover:bg-success/25 disabled:opacity-40"
          >
            <CheckCircle2 size={16} /> Закрыть
          </button>
        )}
        {ticket.stage === 'PROCESSED' && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-success/10 text-success">
            <CheckCircle2 size={16} /> Закрыта
          </span>
        )}
      </div>

      {actionError && (
        <div className="flex items-start gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5" />
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-surface-900">Карточка</h2>

          <label className="block">
            <span className="text-xs text-surface-500">Название</span>
            <input
              value={title}
              disabled={!canUpdate}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm disabled:opacity-70"
            />
          </label>

          <label className="block">
            <span className="text-xs text-surface-500">Описание</span>
            <textarea
              value={description}
              disabled={!canUpdate}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm disabled:opacity-70"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-surface-500">Срок</span>
              <input
                type="date"
                value={dueDate}
                disabled={!canUpdate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm disabled:opacity-70"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">Источник предупреждения</span>
              <input
                value={warningSource}
                disabled={!canUpdate}
                onChange={(e) => setWarningSource(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm disabled:opacity-70"
              />
            </label>
          </div>

          {canUpdate && (
            <>
              <fieldset>
                <legend className="text-xs text-surface-500 mb-1">Исполнители</legend>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-surface-200 p-2">
                  {staffOptions.length === 0 && (
                    <div className="text-xs text-surface-500">Справочник сотрудников недоступен</div>
                  )}
                  {staffOptions.map((u) => (
                    <label key={u.user_id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(u.user_id)}
                        disabled={watcherIds.includes(u.user_id)}
                        onChange={() => toggleId(assigneeIds, u.user_id, setAssigneeIds)}
                      />
                      {u.full_name || u.user_id} ({ticketRoleLabel(u.role as TicketRole)})
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-surface-500 mb-1">Наблюдатели</legend>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-surface-200 p-2">
                  {staffOptions.map((u) => (
                    <label key={`w-${u.user_id}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={watcherIds.includes(u.user_id)}
                        disabled={assigneeIds.includes(u.user_id)}
                        onChange={() => toggleId(watcherIds, u.user_id, setWatcherIds)}
                      />
                      {u.full_name || u.user_id} ({ticketRoleLabel(u.role as TicketRole)})
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="text-xs text-surface-500">Комментарий к правке (в историю)</span>
                <input
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Сохранить
              </button>
            </>
          )}

          {!canUpdate && (
            <div className="text-sm text-surface-600 space-y-1">
              <div>
                <span className="text-surface-500">Исполнители: </span>
                {(ticket.assignees || []).map(formatPerson).join(', ') || '—'}
              </div>
              <div>
                <span className="text-surface-500">Наблюдатели: </span>
                {(ticket.watchers || []).map(formatPerson).join(', ') || '—'}
              </div>
              <p className="text-xs text-surface-500 pt-2">
                Редактирование полей доступно городскому диспетчеру. Техник меняет только стадию.
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="font-semibold text-surface-900">Участники</h3>
            <div className="text-sm space-y-2">
              <div>
                <div className="text-xs text-surface-500">Постановщик</div>
                <div>{formatPerson(ticket.author)}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500">Создана</div>
                <div>{formatDateTime(ticket.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500">Обновлена</div>
                <div>{formatDateTime(ticket.updated_at)}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500">Срок</div>
                <div className={overdue ? 'text-danger font-medium' : ''}>{formatDate(ticket.due_date)}</div>
              </div>
              {ticket.closed_at && (
                <div>
                  <div className="text-xs text-surface-500">Закрыта</div>
                  <div>{formatDateTime(ticket.closed_at)}</div>
                </div>
              )}
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold text-surface-900 flex items-center gap-2">
              <MapPin size={16} /> Статус объекта
            </h3>
            <div className="text-sm text-surface-700">
              <span className="text-surface-500">Объект: </span>
              {ticket.object_id}
            </div>
            {mapObject ? (
              <div className="text-xs text-surface-500">
                Сейчас на карте:{' '}
                <span className="font-medium text-surface-800">
                  {COLLECTOR_STATUS_META[deriveCollectorStatus(mapObject.sensors)].label}
                </span>
                {mapObject.taskId ? ` · заявка #${mapObject.taskId}` : ''}
              </div>
            ) : (
              <p className="text-xs text-surface-500">
                Объект не найден в локальном реестре карты — статус будет сохранён локально при
                первом изменении.
              </p>
            )}
            {!canChangeObjectStatus && (
              <p className="text-xs text-surface-500">
                Менять статус объекта может городской диспетчер.
              </p>
            )}
            {canChangeObjectStatus && (
              <>
                <select
                  value={objectStatus}
                  onChange={(e) => setObjectStatus(e.target.value as MapObjectStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm"
                >
                  {OBJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {COLLECTOR_STATUS_META[s].label}
                      {s === 'maintenance' ? ' (нужна эта заявка)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-surface-500 leading-relaxed">
                  Статус ТО всегда привязывает объект к этой заявке на карте. Снятие ТО отвязывает
                  заявку от объекта.
                </p>
                <button
                  type="button"
                  disabled={objectStatusSaving}
                  onClick={handleObjectStatus}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-info/15 text-info hover:bg-info/25 disabled:opacity-50"
                >
                  {objectStatusSaving ? 'Сохранение…' : 'Применить статус объекта'}
                </button>
              </>
            )}
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold text-surface-900">Смена стадии</h3>
            {!canStage && (
              <p className="text-xs text-surface-500">Нет права ticket.stage_change</p>
            )}
            {canStage && nextStages.length === 0 && (
              <p className="text-sm text-surface-600">Конечная стадия или переходов нет</p>
            )}
            {canStage && nextStages.length > 0 && (
              <>
                <input
                  value={stageComment}
                  onChange={(e) => setStageComment(e.target.value)}
                  placeholder="Комментарий к переходу"
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm"
                />
                <div className="flex flex-col gap-2">
                  {nextStages.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={saving}
                      onClick={() => handleStage(s)}
                      className="px-3 py-2 rounded-lg text-sm bg-surface-200 hover:bg-surface-300 text-surface-900 text-left disabled:opacity-50"
                    >
                      → {ticketStageLabel(s)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Card>

          {canComment && (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <MessageSquare size={16} /> Комментарий
              </h3>
              <form onSubmit={handleComment} className="space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm"
                  placeholder="Текст комментария"
                />
                <button
                  type="submit"
                  disabled={saving || !commentText.trim()}
                  className="w-full px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50"
                >
                  Отправить
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <History size={16} /> История изменений
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-surface-500">Записей пока нет</p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="text-sm border-b border-surface-200/60 pb-3 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-surface-900">{h.action}</span>
                  <span className="text-xs text-surface-500">{formatDateTime(h.created_at)}</span>
                </div>
                <div className="text-surface-600 mt-0.5">
                  {formatPerson(h.changed_by)}
                  {h.field ? ` · ${h.field}` : ''}
                  {h.old_value || h.new_value
                    ? `: ${h.old_value || '∅'} → ${h.new_value || '∅'}`
                    : ''}
                </div>
                {h.comment && <div className="text-surface-700 mt-1 italic">«{h.comment}»</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
