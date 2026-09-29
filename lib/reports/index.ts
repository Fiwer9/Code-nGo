import { buildPdf } from './buildPdf'
import { buildXlsx } from './buildXlsx'
import { collectReportData } from './collectData'
import type { GenerateReportOptions, ReportData } from './types'

export type { GenerateReportOptions, ReportData, ReportKind, ReportFormat, ReportPeriod } from './types'
export { collectReportData, periodRange } from './collectData'

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

export function reportFileName(kind: GenerateReportOptions['kind'], format: GenerateReportOptions['format']): string {
  const base = kind === 'repairs' ? 'remonty' : 'analitika'
  return `${base}_${stamp()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function generateReport(options: GenerateReportOptions): Promise<{
  data: ReportData
  blob: Blob
  filename: string
}> {
  const data = await collectReportData(options.kind, options.period)
  const blob = options.format === 'pdf' ? await buildPdf(data) : buildXlsx(data)
  const filename = reportFileName(options.kind, options.format)
  return { data, blob, filename }
}

export async function generateAndDownload(options: GenerateReportOptions) {
  const result = await generateReport(options)
  downloadBlob(result.blob, result.filename)
  return result
}
