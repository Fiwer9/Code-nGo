import type { EquipmentItem, IncidentItem, PredictionItem } from '@/lib/api/monitoringTypes'
import type { HistoryEntryDTO, StageStatsResponse, TicketDTO } from '@/lib/api/ticketTypes'

export type ReportKind = 'repairs' | 'analytics'
export type ReportFormat = 'pdf' | 'xlsx'
export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

export type SensorSnapshot = {
  id: string
  name: string
  type: string
  status: string
  location: string
  lastCheck: string
  phase: 'before' | 'after' | 'current'
  note?: string
}

export type RepairTicketRow = {
  ticket: TicketDTO
  history: HistoryEntryDTO[]
  sensors: SensorSnapshot[]
  relatedIncidents: IncidentItem[]
  cycleHours: number | null
  stagePath: string[]
}

export type RepairReportData = {
  kind: 'repairs'
  title: string
  periodLabel: string
  generatedAt: string
  from: string
  to: string
  tickets: RepairTicketRow[]
  summary: {
    total: number
    processed: number
    open: number
    overdue: number
    avgCycleHours: number | null
    byStage: { stage: string; title: string; count: number }[]
  }
}

export type AnalyticsReportData = {
  kind: 'analytics'
  title: string
  periodLabel: string
  generatedAt: string
  from: string
  to: string
  equipment: {
    total: number
    online: number
    warning: number
    offline: number
    maintenance: number
    items: EquipmentItem[]
  }
  incidents: {
    total: number
    byType: { type: string; count: number }[]
    byStatus: { status: string; count: number }[]
    items: IncidentItem[]
  }
  predictions: {
    total: number
    verified: number
    rejected: number
    pending: number
    accuracyPct: number | null
    byType: { type: string; count: number }[]
    items: PredictionItem[]
  }
  tickets: StageStatsResponse & {
    inPeriod: number
    processedInPeriod: number
  }
}

export type ReportData = RepairReportData | AnalyticsReportData

export type GenerateReportOptions = {
  kind: ReportKind
  format: ReportFormat
  period: ReportPeriod
}
