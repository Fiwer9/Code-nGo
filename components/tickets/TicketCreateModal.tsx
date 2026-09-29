'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { ApiError } from '@/lib/api/types'
import type { TicketCreateRequest, TicketDTO, UserDTO } from '@/lib/api/ticketTypes'
import {
  createTicket,
  listAllowedObjects,
  listTicketObjects,
  listTicketUsers
} from '@/lib/api/tickets'
import { loadMapObjects, upsertMapObject } from '@/lib/mapObjectsStore'
import { collectorGeo } from '@/lib/collectorGeo'
import { collectorsFromEquipment } from '@/lib/collectorsFromEquipment'
import { getEquipmentCached, peekEquipmentCache } from '@/lib/equipmentCache'
import { ticketRoleLabel } from '@/lib/ticketAccess'
import type { TicketRole } from '@/lib/api/ticketTypes'

type ObjectOption = {
  id: string
  label: string
}

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (ticket: TicketDTO) => void
  defaultObjectId?: string
  defaultTitle?: string
  defaultWarningSource?: string
  canPickAssignees?: boolean
}

function buildObjectOptions(ids: string[]): ObjectOption[] {
  const unique = Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)))
  return unique
    .map((id) => {
      const geo = collectorGeo(id)
      return {
        id,
        label: `${id} · ${geo.address}`
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id, 'ru', { numeric: true }))
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
  const [objectOptions, setObjectOptions] = useState<ObjectOption[]>([])
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
        const [allowed, ticketObjects, equipment, staff] = await Promise.all([
          listAllowedObjects().catch(() => [] as string[]),
          listTicketObjects()
            .then((rows) => rows.map((r) => r.object_id).filter(Boolean))
            .catch(() => [] as string[]),
          getEquipmentCached()
            .then((data) => collectorsFromEquipment(data.items || []).map((c) => c.id))
            .catch(() => {
              const peek = peekEquipmentCache()
              return peek ? collectorsFromEquipment(peek.items).map((c) => c.id) : ([] as string[])
            }),
          canPickAssignees
            ? listTicketUsers().catch(() => [] as UserDTO[])
            : Promise.resolve([] as UserDTO[])
        ])

        if (cancelled) return

        // Коллекторы из мониторинга — основной список; Ticket Service дополняет
        const ids = [...equipment, ...allowed, ...ticketObjects]
        if (defaultObjectId) ids.push(defaultObjectId)
        // Локальные правки карты (если уже есть)
        try {
          for (const o of loadMapObjects()) ids.push(o.id)
        } catch {
          /* ignore */
        }

        const options = buildObjectOptions(ids)
        setObjectOptions(options)
        setUsers(staff.filter((u) => u.is_active !== false))

        if (defaultObjectId) {
          setObjectId(defaultObjectId)
        } else if (options.length === 1) {
          setObjectId(options[0].id)
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
    if (!objectId.trim()) {
      setError('Выберите объект (коллектор)')
      setSaving(false)
      return
    }
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
      try {
        const oid = created.object_id
        const mapObjs = loadMapObjects()
        const found = mapObjs.find((o) => o.id === oid)
        const geo = collectorGeo(oid)
        upsertMapObject({
          ...(found || {
            id: oid,
            type: 'Коллектор',
            len: '—',
            lat: geo.lat,
            lng: geo.lng,
            address: geo.address,
            description: `Коллектор ${oid}`,
            sensors: []
          }),
          taskId: String(created.id)
        })
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
            <span className="text-sm font-medium text-surface-700">Коллектор *</span>
            <select
              required
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
              disabled={loadingMeta && objectOptions.length === 0}
              className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-surface-900 text-sm disabled:opacity-60"
            >
              <option value="">Выберите коллектор</option>
              {defaultObjectId && !objectOptions.some((o) => o.id === defaultObjectId) && (
                <option value={defaultObjectId}>
                  {defaultObjectId} · {collectorGeo(defaultObjectId).address}
                </option>
              )}
              {objectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {!loadingMeta && objectOptions.length === 0 && (
              <p className="mt-1.5 text-xs text-warning">
                Список коллекторов пуст — откройте вкладку «Оборудование» или «Карта», чтобы
                подтянуть данные, и создайте заявку снова.
              </p>
            )}
            {!loadingMeta && objectOptions.length > 0 && (
              <p className="mt-1 text-xs text-surface-500">
                Доступно объектов: {objectOptions.length}
              </p>
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
