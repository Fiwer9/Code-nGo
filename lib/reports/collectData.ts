import {
  collectorIdOfEquipment,
  collectorIdOfIncident,
  listIncidents,
  listPredictions
} from '@/lib/api/monitoring'
import type { EquipmentItem, IncidentItem, PredictionItem } from '@/lib/api/monitoringTypes'
import {
  getTicketHistory,
  getTicketStats,
  listTickets
} from '@/lib/api/tickets'
import type { HistoryEntryDTO, TicketDTO, TicketStage } from '@/lib/api/ticketTypes'
import { getEquipmentCached } from '@/lib/equipmentCache'
import { ticketStageLabel } from '@/lib/ticketAccess'
import { formatDateTime, isOverdue } from '@/lib/ticketUi'
import type {
  AnalyticsReportData,
  RepairReportData,
  RepairTicketRow,
  ReportKind,
  ReportPeriod,
  SensorSnapshot
} from './types'

const PERIOD_DAYS: Record<ReportPeriod, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  day: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год'
}

const DETAIL_TICKET_LIMIT = 40
const HISTORY_CONCURRENCY = 5

export function periodRange(period: ReportPeriod): { from: Date; to: Date; label: string } {
  const to = new Date()
  const from = new Date(to)
  from.setHours(0, 0, 0, 0)
  const days = PERIOD_DAYS[period]
  if (period === 'day') {
    // только сегодня
  } else {
    from.setDate(from.getDate() - (days - 1))
  }
  return { from, to, label: PERIOD_LABELS[period] }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function inRange(iso: string | null | undefined, from: Date, to: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= from.getTime() && t <= to.getTime()
}

function countBy<T>(items: T[], keyFn: (item: T) => string): { type?: string; status?: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = keyFn(item) || '—'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()]
    .map(([k, count]) => ({ type: k, status: k, count }))
    .sort((a, b) => b.count - a.count)
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return out
}

function cycleHours(ticket: TicketDTO, history: HistoryEntryDTO[]): number | null {
  const start = new Date(ticket.created_at).getTime()
  if (Number.isNaN(start)) return null
  let end: number | null = ticket.closed_at ? new Date(ticket.closed_at).getTime() : null
  if (end == null || Number.isNaN(end)) {
    const processed = history.find(
      (h) =>
        (h.field === 'stage' || h.action?.toLowerCase().includes('stage')) &&
        (h.new_value === 'PROCESSED' || h.new_value?.includes('Обработ'))
    )
    if (processed) end = new Date(processed.created_at).getTime()
  }
  if (ticket.stage === 'PROCESSED' && (end == null || Number.isNaN(end))) {
    end = new Date(ticket.updated_at).getTime()
  }
  if (end == null || Number.isNaN(end) || end < start) return null
  return Math.round(((end - start) / 36e5) * 10) / 10
}

function stagePath(history: HistoryEntryDTO[], ticket: TicketDTO): string[] {
  const stages: string[] = []
  for (const h of history) {
    if (h.field === 'stage' && h.new_value) {
      stages.push(ticketStageLabel(h.new_value))
    } else if (h.action?.toLowerCase().includes('stage') && h.new_value) {
      stages.push(ticketStageLabel(h.new_value))
    }
  }
  if (stages.length === 0) stages.push(ticket.stage_title || ticketStageLabel(ticket.stage))
  return stages
}

function sensorsForTicket(
  ticket: TicketDTO,
  equipment: EquipmentItem[],
  relatedIncidents: IncidentItem[]
): SensorSnapshot[] {
  const oid = String(ticket.object_id)
  const related = equipment.filter((e) => collectorIdOfEquipment(e) === oid)
  const alertish = related.filter((e) => {
    const s = (e.status || '').toLowerCase()
    return s.includes('warn') || s.includes('off') || s.includes('crit') || s.includes('maint')
  })

  const before: SensorSnapshot[] = []
  // ДО: инциденты у объекта около создания заявки + датчики в warning/offline
  for (const inc of relatedIncidents.slice(0, 8)) {
    before.push({
      id: inc.id,
      name: inc.type || 'Инцидент',
      type: 'incident',
      status: inc.status,
      location: inc.location || oid,
      lastCheck: formatDateTime(inc.date),
      phase: 'before',
      note: `Инцидент на момент заявки · вероятность ${inc.probability ?? '—'}%`
    })
  }
  for (const e of (alertish.length ? alertish : related).slice(0, 12)) {
    before.push({
      id: e.id,
      name: e.name || e.id,
      type: e.sensor_type || e.type,
      status: e.status,
      location: e.location || '—',
      lastCheck: formatDateTime(e.lastCheck),
      phase: 'before',
      note: 'Снимок датчика (исторический ряд API недоступен — текущий статус как прокси «ДО»)'
    })
  }

  const afterPhase: SensorSnapshot['phase'] = ticket.stage === 'PROCESSED' ? 'after' : 'current'
  const afterLabel =
    ticket.stage === 'PROCESSED'
      ? 'Показатели после закрытия (текущий снимок)'
      : 'Текущие показатели (заявка ещё открыта)'

  const after: SensorSnapshot[] = related.slice(0, 16).map((e) => ({
    id: e.id,
    name: e.name || e.id,
    type: e.sensor_type || e.type,
    status: e.status,
    location: e.location || '—',
    lastCheck: formatDateTime(e.lastCheck),
    phase: afterPhase,
    note: afterLabel
  }))

  // дедуп по id+phase
  const seen = new Set<string>()
  return [...before, ...after].filter((s) => {
    const k = `${s.phase}:${s.id}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function listTicketsInPeriod(from: Date, to: Date): Promise<TicketDTO[]> {
  const pageSize = 100
  const all: TicketDTO[] = []
  let page = 1
  const maxPages = 10
  while (page <= maxPages) {
    const res = await listTickets({
      created_from: toIsoDate(from),
      created_to: toIsoDate(to),
      page,
      page_size: pageSize,
      order_by: 'created_at',
      order_desc: true
    })
    const items = res.items || []
    all.push(...items)
    if (items.length < pageSize || page >= (res.pages || 1)) break
    page += 1
  }
  return all
}

async function collectRepairs(period: ReportPeriod): Promise<RepairReportData> {
  const { from, to, label } = periodRange(period)
  const [tickets, equipmentRes, incidentsRes] = await Promise.all([
    listTicketsInPeriod(from, to),
    getEquipmentCached().catch(() => ({ items: [] as EquipmentItem[] })),
    listIncidents({ limit: 500, offset: 0 }).catch(() => ({ items: [] as IncidentItem[] }))
  ])

  const equipment = equipmentRes.items || []
  const incidents = (incidentsRes.items || []).filter((i) => inRange(i.date, from, to))

  const detailTickets = tickets.slice(0, DETAIL_TICKET_LIMIT)
  const rows = await mapPool(detailTickets, HISTORY_CONCURRENCY, async (ticket) => {
    const history = await getTicketHistory(ticket.id).catch(() => [] as HistoryEntryDTO[])
    const relatedIncidents = incidents.filter(
      (inc) => collectorIdOfIncident(inc) === String(ticket.object_id)
    )
    const row: RepairTicketRow = {
      ticket,
      history: history.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
      sensors: sensorsForTicket(ticket, equipment, relatedIncidents),
      relatedIncidents,
      cycleHours: cycleHours(ticket, history),
      stagePath: stagePath(history, ticket)
    }
    return row
  })

  const byStageMap = new Map<TicketStage, number>()
  let overdue = 0
  let processed = 0
  const cycles: number[] = []
  for (const t of tickets) {
    byStageMap.set(t.stage, (byStageMap.get(t.stage) || 0) + 1)
    if (t.stage === 'PROCESSED') processed += 1
    if (isOverdue(t.due_date, t.stage)) overdue += 1
  }
  for (const r of rows) {
    if (r.cycleHours != null) cycles.push(r.cycleHours)
  }

  return {
    kind: 'repairs',
    title: 'Исторический отчёт о ремонтах',
    periodLabel: label,
    generatedAt: new Date().toISOString(),
    from: from.toISOString(),
    to: to.toISOString(),
    tickets: rows,
    summary: {
      total: tickets.length,
      processed,
      open: tickets.length - processed,
      overdue,
      avgCycleHours:
        cycles.length > 0
          ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10
          : null,
      byStage: [...byStageMap.entries()].map(([stage, count]) => ({
        stage,
        title: ticketStageLabel(stage),
        count
      }))
    }
  }
}

async function collectAnalytics(period: ReportPeriod): Promise<AnalyticsReportData> {
  const { from, to, label } = periodRange(period)
  const [equipmentRes, incidentsRes, predictionsRes, ticketStats, tickets] = await Promise.all([
    getEquipmentCached().catch(() => ({
      items: [] as EquipmentItem[],
      stats: { total: 0, online: 0, warning: 0, offline: 0, maintenance: 0 }
    })),
    listIncidents({ limit: 500, offset: 0 }).catch(() => ({ items: [] as IncidentItem[] })),
    listPredictions({ limit: 500, offset: 0 }).catch(() => ({ items: [] as PredictionItem[] })),
    getTicketStats().catch(() => ({ total: 0, by_stage: [], overdue: 0 })),
    listTicketsInPeriod(from, to).catch(() => [] as TicketDTO[])
  ])

  const incidents = (incidentsRes.items || []).filter((i) => inRange(i.date, from, to))
  const predictions = (predictionsRes.items || []).filter((p) =>
    inRange(p.date || p.created_at || null, from, to)
  )

  const verified = predictions.filter(
    (p) => p.verified || p.decision === 'verified' || p.decision === 'accepted'
  ).length
  const rejected = predictions.filter((p) => p.decision === 'rejected').length
  const pending = predictions.length - verified - rejected
  const decided = verified + rejected

  const stats = equipmentRes.stats || {
    total: equipmentRes.items?.length || 0,
    online: 0,
    warning: 0,
    offline: 0,
    maintenance: 0
  }

  const byTypeInc = countBy(incidents, (i) => i.type || '—').map((r) => ({
    type: r.type!,
    count: r.count
  }))
  const byStatusInc = countBy(incidents, (i) => i.status || '—').map((r) => ({
    status: r.status!,
    count: r.count
  }))
  const byTypePred = countBy(predictions, (p) => String(p.type || '—')).map((r) => ({
    type: r.type!,
    count: r.count
  }))

  return {
    kind: 'analytics',
    title: 'Аналитический отчёт для руководства',
    periodLabel: label,
    generatedAt: new Date().toISOString(),
    from: from.toISOString(),
    to: to.toISOString(),
    equipment: {
      total: stats.total,
      online: stats.online,
      warning: stats.warning,
      offline: stats.offline,
      maintenance: stats.maintenance,
      items: (equipmentRes.items || []).slice(0, 200)
    },
    incidents: {
      total: incidents.length,
      byType: byTypeInc,
      byStatus: byStatusInc,
      items: incidents
    },
    predictions: {
      total: predictions.length,
      verified,
      rejected,
      pending: Math.max(0, pending),
      accuracyPct: decided > 0 ? Math.round((verified / decided) * 1000) / 10 : null,
      byType: byTypePred,
      items: predictions
    },
    tickets: {
      ...ticketStats,
      inPeriod: tickets.length,
      processedInPeriod: tickets.filter((t) => t.stage === 'PROCESSED').length
    }
  }
}

export async function collectReportData(kind: ReportKind, period: ReportPeriod) {
  if (kind === 'repairs') return collectRepairs(period)
  return collectAnalytics(period)
}
