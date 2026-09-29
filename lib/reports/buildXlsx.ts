import * as XLSX from 'xlsx'
import { formatDateTime, formatPerson } from '@/lib/ticketUi'
import type { AnalyticsReportData, RepairReportData, ReportData } from './types'

function sheet(rows: (string | number | null | undefined)[][]) {
  return XLSX.utils.aoa_to_sheet(
    rows.map((r) => r.map((c) => (c == null || c === '' ? '—' : c)))
  )
}

function buildRepairsWorkbook(data: RepairReportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['Исторический отчёт о ремонтах'],
      ['Период', data.periodLabel],
      ['С', formatDateTime(data.from)],
      ['По', formatDateTime(data.to)],
      ['Сформирован', formatDateTime(data.generatedAt)],
      [],
      ['Всего заявок', data.summary.total],
      ['Закрыто', data.summary.processed],
      ['Открыто', data.summary.open],
      ['Просрочено', data.summary.overdue],
      ['Средний цикл, ч', data.summary.avgCycleHours ?? '—'],
      [],
      ['Стадия', 'Кол-во'],
      ...data.summary.byStage.map((s) => [s.title, s.count])
    ]),
    'Сводка'
  )

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      [
        'ID',
        'Название',
        'Стадия',
        'Объект',
        'Автор',
        'Исполнители',
        'Создана',
        'Обновлена',
        'Закрыта',
        'Срок',
        'Источник',
        'Цикл ч',
        'Путь стадий',
        'Описание'
      ],
      ...data.tickets.map((r) => [
        r.ticket.id,
        r.ticket.title,
        r.ticket.stage_title || r.ticket.stage,
        r.ticket.object_id,
        formatPerson(r.ticket.author),
        (r.ticket.assignees || []).map((a) => formatPerson(a)).join(', '),
        formatDateTime(r.ticket.created_at),
        formatDateTime(r.ticket.updated_at),
        formatDateTime(r.ticket.closed_at),
        formatDateTime(r.ticket.due_date),
        r.ticket.warning_source || '',
        r.cycleHours ?? '',
        r.stagePath.join(' → '),
        r.ticket.description || ''
      ])
    ]),
    'Заявки'
  )

  const historyRows: (string | number)[][] = [
    ['Ticket ID', 'Дата', 'Действие', 'Поле', 'Было', 'Стало', 'Кто', 'Комментарий']
  ]
  for (const r of data.tickets) {
    for (const h of r.history) {
      historyRows.push([
        r.ticket.id,
        formatDateTime(h.created_at),
        h.action || '',
        h.field || '',
        h.old_value || '',
        h.new_value || '',
        formatPerson(h.changed_by),
        h.comment || ''
      ])
    }
  }
  XLSX.utils.book_append_sheet(wb, sheet(historyRows), 'История')

  const sensorRows: (string | number)[][] = [
    ['Ticket ID', 'Фаза', 'ID', 'Имя', 'Тип', 'Статус', 'Локация', 'Время', 'Примечание']
  ]
  for (const r of data.tickets) {
    for (const s of r.sensors) {
      sensorRows.push([
        r.ticket.id,
        s.phase === 'before' ? 'ДО' : s.phase === 'after' ? 'ПОСЛЕ' : 'ТЕКУЩИЕ',
        s.id,
        s.name,
        s.type,
        s.status,
        s.location,
        s.lastCheck,
        s.note || ''
      ])
    }
  }
  XLSX.utils.book_append_sheet(wb, sheet(sensorRows), 'Датчики')

  return wb
}

function buildAnalyticsWorkbook(data: AnalyticsReportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['Аналитический отчёт для руководства'],
      ['Период', data.periodLabel],
      ['С', formatDateTime(data.from)],
      ['По', formatDateTime(data.to)],
      ['Сформирован', formatDateTime(data.generatedAt)],
      [],
      ['Оборудование: всего', data.equipment.total],
      ['Онлайн', data.equipment.online],
      ['Внимание', data.equipment.warning],
      ['Офлайн', data.equipment.offline],
      ['ТО', data.equipment.maintenance],
      [],
      ['Инциденты за период', data.incidents.total],
      ['Прогнозы за период', data.predictions.total],
      ['Подтверждено', data.predictions.verified],
      ['Отклонено', data.predictions.rejected],
      ['Без решения', data.predictions.pending],
      ['Точность, %', data.predictions.accuracyPct ?? '—'],
      [],
      ['Заявки в системе', data.tickets.total ?? 0],
      ['Просрочено', data.tickets.overdue ?? 0],
      ['Создано за период', data.tickets.inPeriod],
      ['Закрыто за период', data.tickets.processedInPeriod]
    ]),
    'KPI'
  )

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['Тип инцидента', 'Кол-во'],
      ...data.incidents.byType.map((r) => [r.type, r.count]),
      [],
      ['Статус', 'Кол-во'],
      ...data.incidents.byStatus.map((r) => [r.status, r.count])
    ]),
    'Инциденты сводка'
  )

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['ID', 'Объект', 'Имя объекта', 'Тип', 'Статус', 'Вероятность', 'Дата', 'Локация'],
      ...data.incidents.items.map((i) => [
        i.id,
        i.parentId ?? i.objectId,
        i.object,
        i.type,
        i.status,
        i.probability ?? '',
        formatDateTime(i.date),
        i.location
      ])
    ]),
    'Инциденты'
  )

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['ID', 'Объект', 'Тип', 'Статус', 'Вероятность', 'Горизонт', 'Модель', 'Решение', 'Дата'],
      ...data.predictions.items.map((p) => [
        p.id,
        p.parentId ?? p.objectId ?? p.object ?? '',
        p.type || '',
        p.status || '',
        p.probability ?? '',
        p.horizon || '',
        p.model || '',
        p.decision || (p.verified ? 'verified' : ''),
        formatDateTime(p.date || p.created_at)
      ])
    ]),
    'Прогнозы'
  )

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['ID', 'Имя', 'Тип', 'Датчик', 'Система', 'Статус', 'Локация', 'Коллектор', 'Проверка'],
      ...data.equipment.items.map((e) => [
        e.id,
        e.name,
        e.type,
        e.sensor_type,
        e.system_type,
        e.status,
        e.location,
        e.parentId ?? e.objectId ?? '',
        formatDateTime(e.lastCheck)
      ])
    ]),
    'Оборудование'
  )

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ['Стадия', 'Кол-во'],
      ...(data.tickets.by_stage || []).map((s) => [s.title || s.stage, s.count])
    ]),
    'Заявки стадии'
  )

  return wb
}

export function buildXlsx(data: ReportData): Blob {
  const wb = data.kind === 'repairs' ? buildRepairsWorkbook(data) : buildAnalyticsWorkbook(data)
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}
