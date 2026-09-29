import type { TicketStage } from '@/lib/api/ticketTypes'
import { ticketStageLabel } from '@/lib/ticketAccess'

export const STAGE_ORDER: TicketStage[] = [
  'UNPROCESSED',
  'PENDING_MAINT',
  'DIAGNOSTICS',
  'IN_PROGRESS',
  'CONTROL',
  'PROCESSED'
]

export const STAGE_BADGE: Record<TicketStage, string> = {
  UNPROCESSED: 'bg-surface-500/15 text-surface-700',
  PENDING_MAINT: 'bg-info/15 text-info',
  DIAGNOSTICS: 'bg-primary-500/15 text-primary-700 dark:text-primary-300',
  IN_PROGRESS: 'bg-warning/20 text-warning',
  CONTROL: 'bg-primary-600/15 text-primary-800 dark:text-primary-200',
  PROCESSED: 'bg-success/15 text-success'
}

export function formatPerson(p?: { full_name?: string; user_id: string } | null): string {
  if (!p) return '—'
  return p.full_name?.trim() || p.user_id
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${d}.${m}.${y}`
  }
  return formatDateTime(value)
}

export function isOverdue(dueDate?: string | null, stage?: TicketStage): boolean {
  if (!dueDate || stage === 'PROCESSED') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  due.setHours(0, 0, 0, 0)
  return due < today
}

export { ticketStageLabel }
