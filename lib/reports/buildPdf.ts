import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import { formatDateTime, formatPerson } from '@/lib/ticketUi'
import type { AnalyticsReportData, RepairReportData, RepairTicketRow, ReportData } from './types'

async function loadPdfMake() {
  const [{ default: pdfMakeMod }, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js')
  ])
  // CJS / ESM interop across pdfmake builds
  const pdfMake = (pdfMakeMod as { default?: unknown })?.default ?? pdfMakeMod
  const vfs = (vfsMod as { default?: unknown }).default ?? vfsMod
  const api = pdfMake as {
    addVirtualFileSystem?: (vfs: unknown) => void
    vfs?: unknown
    createPdf: (doc: TDocumentDefinitions) => { getBlob: () => Promise<Blob> }
  }
  if (typeof api.addVirtualFileSystem === 'function') {
    api.addVirtualFileSystem(vfs)
  } else {
    api.vfs = vfs
  }
  return api
}

function headerBlock(title: string, subtitle: string, generatedAt: string): Content[] {
  return [
    { text: 'Москоллектор · Система мониторинга', style: 'brand' },
    { text: title, style: 'title', margin: [0, 4, 0, 2] },
    { text: subtitle, style: 'sub' },
    {
      text: `Сформирован: ${formatDateTime(generatedAt)}`,
      style: 'meta',
      margin: [0, 2, 0, 12]
    }
  ]
}

function kvTable(rows: [string, string][]): Content {
  return {
    table: {
      widths: [140, '*'],
      body: rows.map(([k, v]) => [
        { text: k, style: 'kvKey' },
        { text: v || '—', style: 'kvVal' }
      ])
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 10]
  }
}

function simpleTable(headers: string[], rows: string[][]): Content {
  const head: TableCell[] = headers.map((h) => ({ text: h, style: 'th' }))
  const body: TableCell[][] = [
    head,
    ...rows.map((r) => r.map((c) => ({ text: c || '—', style: 'td' })))
  ]
  return {
    table: {
      headerRows: 1,
      widths: headers.map(() => '*'),
      body
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 10]
  }
}

function ticketSection(row: RepairTicketRow, index: number): Content[] {
  const t = row.ticket
  const blocks: Content[] = [
    {
      text: `${index + 1}. Заявка #${t.id} — ${t.title}`,
      style: 'h2',
      margin: [0, 10, 0, 4],
      pageBreak: index === 0 ? undefined : 'before'
    },
    kvTable([
      ['Стадия', t.stage_title || t.stage],
      ['Объект', t.object_id],
      ['Автор', formatPerson(t.author)],
      [
        'Исполнители',
        (t.assignees || []).map((a) => formatPerson(a)).join(', ') || '—'
      ],
      ['Создана', formatDateTime(t.created_at)],
      ['Обновлена', formatDateTime(t.updated_at)],
      ['Закрыта', formatDateTime(t.closed_at)],
      ['Срок', formatDateTime(t.due_date)],
      ['Источник предупреждения', t.warning_source || '—'],
      ['Цикл, ч', row.cycleHours != null ? String(row.cycleHours) : '—'],
      ['Путь стадий', row.stagePath.join(' → ') || '—']
    ]),
    { text: 'Описание', style: 'h3' },
    { text: t.description?.trim() || '—', style: 'body', margin: [0, 0, 0, 8] }
  ]

  if (row.history.length) {
    blocks.push({ text: 'Ход решения (история)', style: 'h3' })
    blocks.push(
      simpleTable(
        ['Дата', 'Действие', 'Поле', 'Было', 'Стало', 'Кто', 'Комментарий'],
        row.history.map((h) => [
          formatDateTime(h.created_at),
          h.action || '—',
          h.field || '—',
          h.old_value || '—',
          h.new_value || '—',
          formatPerson(h.changed_by),
          h.comment || '—'
        ])
      )
    )
  }

  const before = row.sensors.filter((s) => s.phase === 'before')
  const after = row.sensors.filter((s) => s.phase === 'after' || s.phase === 'current')
  if (before.length) {
    blocks.push({ text: 'Показатели ДО / связанные инциденты', style: 'h3' })
    blocks.push(
      simpleTable(
        ['ID', 'Имя/тип', 'Статус', 'Локация', 'Время', 'Примечание'],
        before.map((s) => [s.id, `${s.name} (${s.type})`, s.status, s.location, s.lastCheck, s.note || ''])
      )
    )
  }
  if (after.length) {
    blocks.push({
      text: after[0]?.phase === 'after' ? 'Показатели ПОСЛЕ' : 'Текущие показатели',
      style: 'h3'
    })
    blocks.push(
      simpleTable(
        ['ID', 'Имя/тип', 'Статус', 'Локация', 'Проверка'],
        after.map((s) => [s.id, `${s.name} (${s.type})`, s.status, s.location, s.lastCheck])
      )
    )
  }

  return blocks
}

function repairsDoc(data: RepairReportData): TDocumentDefinitions {
  const content: Content[] = [
    ...headerBlock(
      data.title,
      `Период: ${data.periodLabel} · ${formatDateTime(data.from)} — ${formatDateTime(data.to)}`,
      data.generatedAt
    ),
    { text: 'Сводка', style: 'h2' },
    kvTable([
      ['Всего заявок', String(data.summary.total)],
      ['Закрыто', String(data.summary.processed)],
      ['Открыто', String(data.summary.open)],
      ['Просрочено', String(data.summary.overdue)],
      [
        'Средний цикл, ч',
        data.summary.avgCycleHours != null ? String(data.summary.avgCycleHours) : '—'
      ]
    ]),
    { text: 'По стадиям', style: 'h3' },
    simpleTable(
      ['Стадия', 'Кол-во'],
      data.summary.byStage.map((s) => [s.title, String(s.count)])
    ),
    {
      text:
        data.tickets.length === 0
          ? 'За выбранный период заявок не найдено.'
          : `Детализация по заявкам (до ${data.tickets.length} шт.)`,
      style: 'h2',
      margin: [0, 8, 0, 4]
    }
  ]

  data.tickets.forEach((row, i) => content.push(...ticketSection(row, i)))

  return {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    styles: {
      brand: { fontSize: 9, color: '#64748b' },
      title: { fontSize: 16, bold: true, color: '#0f172a' },
      sub: { fontSize: 10, color: '#475569' },
      meta: { fontSize: 8, color: '#94a3b8' },
      h2: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 6, 0, 4] },
      h3: { fontSize: 10, bold: true, color: '#1e293b', margin: [0, 4, 0, 2] },
      body: { fontSize: 9, color: '#334155' },
      kvKey: { fontSize: 8, color: '#64748b' },
      kvVal: { fontSize: 9, color: '#0f172a' },
      th: { fontSize: 8, bold: true, color: '#0f172a', fillColor: '#e2e8f0' },
      td: { fontSize: 7, color: '#334155' }
    },
    pageMargins: [36, 36, 36, 40],
    footer: (currentPage, pageCount) => ({
      text: `стр. ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#94a3b8',
      margin: [0, 10, 0, 0]
    })
  }
}

function analyticsDoc(data: AnalyticsReportData): TDocumentDefinitions {
  const content: Content[] = [
    ...headerBlock(
      data.title,
      `Период: ${data.periodLabel} · ${formatDateTime(data.from)} — ${formatDateTime(data.to)}`,
      data.generatedAt
    ),
    { text: 'KPI оборудования', style: 'h2' },
    kvTable([
      ['Всего датчиков', String(data.equipment.total)],
      ['Онлайн', String(data.equipment.online)],
      ['Внимание', String(data.equipment.warning)],
      ['Офлайн', String(data.equipment.offline)],
      ['ТО / обслуживание', String(data.equipment.maintenance)]
    ]),
    { text: 'Инциденты', style: 'h2' },
    kvTable([['Всего за период', String(data.incidents.total)]]),
    simpleTable(
      ['Тип', 'Кол-во'],
      data.incidents.byType.slice(0, 15).map((r) => [r.type, String(r.count)])
    ),
    simpleTable(
      ['Статус', 'Кол-во'],
      data.incidents.byStatus.slice(0, 15).map((r) => [r.status, String(r.count)])
    ),
    { text: 'ML-прогнозы', style: 'h2' },
    kvTable([
      ['Всего', String(data.predictions.total)],
      ['Подтверждено', String(data.predictions.verified)],
      ['Отклонено', String(data.predictions.rejected)],
      ['Без решения', String(data.predictions.pending)],
      [
        'Точность решений, %',
        data.predictions.accuracyPct != null ? String(data.predictions.accuracyPct) : '—'
      ]
    ]),
    simpleTable(
      ['Тип прогноза', 'Кол-во'],
      data.predictions.byType.slice(0, 15).map((r) => [r.type, String(r.count)])
    ),
    { text: 'Заявки', style: 'h2' },
    kvTable([
      ['Всего в системе', String(data.tickets.total ?? 0)],
      ['Просрочено (система)', String(data.tickets.overdue ?? 0)],
      ['Создано за период', String(data.tickets.inPeriod)],
      ['Закрыто за период', String(data.tickets.processedInPeriod)]
    ]),
    simpleTable(
      ['Стадия', 'Кол-во'],
      (data.tickets.by_stage || []).map((s) => [s.title || s.stage, String(s.count)])
    ),
    { text: 'Инциденты за период (выборка)', style: 'h2', pageBreak: 'before' },
    simpleTable(
      ['ID', 'Объект', 'Тип', 'Статус', 'Вер.', 'Дата', 'Локация'],
      data.incidents.items.slice(0, 80).map((i) => [
        i.id,
        String(i.parentId ?? i.objectId),
        i.type,
        i.status,
        i.probability != null ? `${i.probability}%` : '—',
        formatDateTime(i.date),
        i.location
      ])
    ),
    { text: 'Прогнозы за период (выборка)', style: 'h2', pageBreak: 'before' },
    simpleTable(
      ['ID', 'Объект', 'Тип', 'Статус', 'Вер.', 'Модель', 'Решение', 'Дата'],
      data.predictions.items.slice(0, 80).map((p) => [
        p.id,
        String(p.parentId ?? p.objectId ?? p.object ?? '—'),
        String(p.type || '—'),
        String(p.status || '—'),
        p.probability != null ? `${p.probability}%` : '—',
        String(p.model || '—'),
        String(p.decision || (p.verified ? 'verified' : '—')),
        formatDateTime(p.date || p.created_at)
      ])
    )
  ]

  return {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    styles: {
      brand: { fontSize: 9, color: '#64748b' },
      title: { fontSize: 16, bold: true, color: '#0f172a' },
      sub: { fontSize: 10, color: '#475569' },
      meta: { fontSize: 8, color: '#94a3b8' },
      h2: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 8, 0, 4] },
      h3: { fontSize: 10, bold: true, color: '#1e293b', margin: [0, 4, 0, 2] },
      kvKey: { fontSize: 8, color: '#64748b' },
      kvVal: { fontSize: 9, color: '#0f172a' },
      th: { fontSize: 8, bold: true, color: '#0f172a', fillColor: '#e2e8f0' },
      td: { fontSize: 7, color: '#334155' }
    },
    pageMargins: [36, 36, 36, 40],
    footer: (currentPage, pageCount) => ({
      text: `стр. ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#94a3b8',
      margin: [0, 10, 0, 0]
    })
  }
}

export async function buildPdf(data: ReportData): Promise<Blob> {
  const pdfMake = await loadPdfMake()
  const doc = data.kind === 'repairs' ? repairsDoc(data) : analyticsDoc(data)
  return pdfMake.createPdf(doc).getBlob()
}
