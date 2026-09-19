import { ReactNode } from 'react'
import clsx from 'clsx'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
}

export default function DataTable<T extends Record<string, any>>({ data, columns, onRowClick }: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-200">
            {columns.map(col => (
              <th key={col.key} className={clsx('text-left text-xs uppercase tracking-wider text-surface-500 font-semibold py-3 px-4', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={clsx(
                'border-b border-surface-200/50 transition-colors',
                onRowClick && 'hover:bg-surface-200/50 cursor-pointer'
              )}
            >
              {columns.map(col => (
                <td key={col.key} className={clsx('py-3 px-4 text-sm', col.className)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}