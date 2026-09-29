'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { ApiError } from '@/lib/api/types'
import type { TicketCreateRequest, TicketDTO, UserDTO } from '@/lib/api/ticketTypes'
import { createTicket, listAllowedObjects, listTicketUsers } from '@/lib/api/tickets'
import { loadMapObjects, upsertMapObject } from '@/lib/mapObjectsStore'
import { ticketRoleLabel } from '@/lib/ticketAccess'
import type { TicketRole } from '@/lib/api/ticketTypes'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (ticket: TicketDTO) => void
  defaultObjectId?: string
  defaultTitle?: string
  defaultWarningSource?: string
  /** ADMIN может выбрать начальную стадию — UI оставляет UNPROCESSED по умолчанию */
  canPickAssignees?: boolean
}

export default function TicketCreateModal({
  open,
  onClose,
  onCreated,
  defaultObjectId = '',
  defaultTitle = '',
  defaultWarningSource = '',
  canPickAssignees = true
}: Props) {
  const [title, setTitle] = useState(defaultTitle)
  const [objectId, setObjectId] = useState(defaultObjectId)
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [warningSource, setWarningSource] = useState(defaultWarningSource)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [watcherIds, setWatcherIds] = useState<string[]>([])
  const [objects, setObjects] = useState<string[]>([])
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(defaultTitle)
    setObjectId(defaultObjectId)
    setDescription('')
    setDueDate('')
    setWarningSource(defaultWarningSource)
    setAssigneeIds([])
    setWatcherIds([])
    setError(null)

    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      try {
        const [allowed, staff] = await Promise.all([
          listAllowedObjects().catch(() => [] as string[]),
          canPickAssignees ? listTicketUsers().catch(() => [] as UserDTO[]) : Promise.resolve([] as UserDTO[])
        ])
        if (cancelled) return
        setObjects(allowed)
        setUsers(staff.filter((u) => u.is_active !== false))
        if (defaultObjectId && !allowed.includes(defaultObjectId) && allowed.length) {
          // оставляем default — сервер сам проверит доступ
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, defaultObjectId, defaultTitle, defaultWarningSource, canPickAssignees])

  const engineers = useMemo(
    () => users.filter((u) => u.role === 'ENGINEER' || u.role === 'MANAGER' || u.role === 'ADMIN'),
    [users]
  )
  const watchCandidates = useMemo(
    () => users.filter((u) => u.role === 'MANAGER' || u.role === 'ADMIN' || u.role === 'OBSERVER'),
    [users]
  )

  if (!open) return null

  const toggle = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    if (assigneeIds.length === 0) {
      setError('Укажите хотя бы одного исполнителя')
      setSaving(false)
      return
    }
    try {
      const payload: TicketCreateRequest = {
        title: title.trim(),
        object_id: objectId.trim(),
        description: description.trim(),
        due_date: dueDate || null,
        warning_source: warningSource.trim() || null,
        assignee_ids: assigneeIds,
        watcher_ids: watcherIds
      }
      const created = await createTicket(payload)
      // Связать объект на карте с новой заявкой (без смены статуса)
      try {
        const objects = loadMapObjects()
        const found = objects.find((o) => o.id === created.object_id)
        if (found) {
          upsertMapObject({ ...found, taskId: String(created.id) })
        }
      } catch {
        /* карта локальная — не блокируем создание */
      }
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать заявку')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-create-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-100 border border-surface-200 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 sticky top-0 bg-surface-100 z-10">
          <h2 id="ticket-create-title" className="text-lg font-bold text-surface-900">
            Новая заявка
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-600"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {loadingMeta && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <Loader2 size={16} className="animate-spin" /> Загрузка справочников…
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-surface-700">Название *</span>
            <input
              required
              minLength={3}
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm"
              placeholder="Плановое ТО насоса…"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-surface-700">Объект *</span>
            {objects.length > 0 ? (
              <select
                required
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm"
              >
                <option value="">Выберите объект</option>
                {defaultObjectId && !objects.includes(defaultObjectId) && (
                  <option value={defaultObjectId}>{defaultObjectId}</option>
                )}
                {objects.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm"
                placeholder="OBJ-101 или ID объекта"
              />
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-surface-700">Описание</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={8000}
              className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm"
              placeholder="Суть предупреждения / работ"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-surface-700">Срок исполнения</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-surface-700">Источник предупреждения</span>
              <input
                value={warningSource}
                onChange={(e) => setWarningSource(e.target.value)}
                maxLength={128}
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm"
                placeholder="SCADA/WARN-…"
              />
            </label>
          </div>

          {canPickAssignees && (
            <fieldset>
              <legend className="text-sm font-medium text-surface-700 mb-2">
                Исполнители * <span className="font-normal text-surface-500">(минимум один)</span>
              </legend>
              <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-lg border border-surface-200 p-2">
                {engineers.length === 0 && (
                  <div className="text-xs text-surface-500 px-1 py-2">
                    Справочник сотрудников Ticket Service пуст или недоступен. Нужны user_id вроде
                    engineer_kuznetsov.
                  </div>
                )}
                {engineers.map((u) => (
                  <label key={u.user_id} className="flex items-center gap-2 text-sm text-surface-800">
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(u.user_id)}
                      disabled={watcherIds.includes(u.user_id)}
                      onChange={() => toggle(assigneeIds, u.user_id, setAssigneeIds)}
                    />
                    <span>
                      {u.full_name || u.user_id}
                      <span className="text-surface-500 ml-1">
                        ({ticketRoleLabel(u.role as TicketRole)})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {canPickAssignees && watchCandidates.length > 0 && (
            <fieldset>
              <legend className="text-sm font-medium text-surface-700 mb-2">Наблюдатели</legend>
              <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-lg border border-surface-200 p-2">
                {watchCandidates.map((u) => (
                  <label key={u.user_id} className="flex items-center gap-2 text-sm text-surface-800">
                    <input
                      type="checkbox"
                      checked={watcherIds.includes(u.user_id)}
                      disabled={assigneeIds.includes(u.user_id)}
                      onChange={() => toggle(watcherIds, u.user_id, setWatcherIds)}
                    />
                    <span>
                      {u.full_name || u.user_id}
                      <span className="text-surface-500 ml-1">
                        ({ticketRoleLabel(u.role as TicketRole)})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm bg-surface-200 hover:bg-surface-300 text-surface-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                title.trim().length < 3 ||
                !objectId.trim() ||
                (canPickAssignees && assigneeIds.length === 0)
              }
              className="px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
