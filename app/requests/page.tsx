'use client'

import { Suspense } from 'react'
import RequestsPage from './RequestsPage'

export default function RequestsRoute() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1600px] mx-auto py-20 text-center text-sm text-surface-600">
          Загрузка модуля заявок…
        </div>
      }
    >
      <RequestsPage />
    </Suspense>
  )
}
