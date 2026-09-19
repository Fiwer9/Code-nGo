'use client'
import { useTheme } from '@/components/ThemeProvider'

export function useChartTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return {
    grid: dark ? '#1f2937' : '#e2e8f0',
    axis: dark ? '#6b7280' : '#64748b',
    tooltip: {
      background: dark ? '#111827' : '#ffffff',
      border: dark ? '1px solid #1f2937' : '1px solid #e2e8f0',
      borderRadius: 8,
      color: dark ? '#f3f4f6' : '#0f172a'
    }
  }
}
