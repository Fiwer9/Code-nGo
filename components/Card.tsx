import { ReactNode } from 'react'
import clsx from 'clsx'

interface Props {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export default function Card({ children, className, hover = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl bg-surface-100 border border-surface-200 p-5',
        'transition-all duration-200',
        hover && 'hover:border-primary-600 hover:shadow-lg hover:shadow-primary-900/20 cursor-pointer hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}