'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Recharts is heavy and only needed here — load it as a separate client chunk,
// with a skeleton whose shape matches the analytics layout to avoid layout shift.
const AnalyticsView = dynamic(
  () => import('@/components/admin/analytics-view').then((m) => ({ default: m.AnalyticsView })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
        <Skeleton className="h-5 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[320px] rounded-2xl" />)}
        </div>
      </div>
    ),
  },
)

export function AnalyticsLazy() {
  return <AnalyticsView />
}
