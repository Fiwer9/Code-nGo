'use client'

import { useCallback, useState } from 'react'
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wrench,
  BarChart3
} from 'lucide-react'
import Card from '@/components/Card'
import {
  generateAndDownload,
  type ReportFormat,
  type ReportKind,
  type ReportPeriod
} from '@/lib/reports'

type GeneratedItem = {
  id: string
  title: string
  kind: ReportKind
  format: ReportFormat
  period: ReportPeriod
  filename: string
  bytesHint: string
  date: string
  blob: Blob
}

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'day', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' }
]

function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`
}

function kindTitle(kind: ReportKind): string {
  return kind === 'repairs' ? 'Исторический отчёт о ремонтах' : 'Аналитический отчёт для руководства'
}

export default function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>('repairs')
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedItem[]>([])

  const run = useCallback(async () => {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const result = await generateAndDownload({ kind, period, format })
      const item: GeneratedItem = {
        id: `${Date.now()}`,
        title: kindTitle(kind),
        kind,
        format,
        period,
        filename: result.filename,
        bytesHint: formatBytes(result.blob.size),
        date: new Date().toLocaleString('ru-RU'),
        blob: result.blob
      }
      setGenerated((prev) => [item, ...prev].slice(0, 12))
      setOk(`Скачан файл ${result.filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сформировать отчёт')
    } finally {
      setBusy(false)
    }
  }, [kind, period, format])

  const redownload = (item: GeneratedItem) => {
    const url = URL.createObjectURL(item.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Отчёты</h1>
        <p className="text-surface-600 mt-1">
          Формирование PDF и XLSX на основе заявок, датчиков и аналитики мониторинга
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Сформированные отчёты</h3>
          {generated.length === 0 ? (
            <div className="text-sm text-surface-500 py-8 text-center">
              Пока нет файлов. Выберите тип и нажмите «Сгенерировать отчёт».
            </div>
          ) : (
            <div className="space-y-2">
              {generated.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-surface-200/30 hover:bg-surface-200/60 transition"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      r.format === 'pdf' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}
                  >
                    {r.kind === 'repairs' ? <Wrench size={18} /> : <BarChart3 size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-900 truncate">{r.title}</div>
                    <div className="text-xs text-surface-500 mt-0.5">
                      {r.format.toUpperCase()} · {r.bytesHint} · {r.date} · {r.filename}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => redownload(r)}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1.5 transition"
                  >
                    <Download size={14} /> Скачать
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Новый отчёт</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-700 mb-1.5">Тип отчёта</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ReportKind)}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="repairs">История ремонтов (по заявкам)</option>
                <option value="analytics">Аналитика для руководства</option>
              </select>
            </div>

            <div className="rounded-lg bg-surface-200/40 p-3 text-xs text-surface-600 space-y-1">
              {kind === 'repairs' ? (
                <>
                  <div className="flex items-start gap-2">
                    <Wrench size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Заявки за период, история стадий, цикл решения, датчики объекта ДО/ПОСЛЕ и
                      связанные инциденты.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <BarChart3 size={14} className="mt-0.5 shrink-0" />
                    <span>
                      KPI оборудования, инциденты и прогнозы ML, точность решений, статистика заявок.
                    </span>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm text-surface-700 mb-1.5">Период</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm"
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-surface-700 mb-1.5">Формат</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`py-2 rounded-lg text-sm transition ${
                    format === 'pdf'
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-200 hover:bg-surface-300 text-surface-900'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`py-2 rounded-lg text-sm transition ${
                    format === 'xlsx'
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-200 hover:bg-surface-300 text-surface-900'
                  }`}
                >
                  XLSX
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-danger bg-danger/10 rounded-lg p-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {ok && !error && (
              <div className="flex items-start gap-2 text-sm text-success bg-success/10 rounded-lg p-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{ok}</span>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Формирование…
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Сгенерировать отчёт
                </>
              )}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
