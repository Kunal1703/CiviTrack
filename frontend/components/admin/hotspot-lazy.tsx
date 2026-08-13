'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Leaflet is client-only (touches window) and heavy — load the hotspot view as a
// separate client chunk with SSR off, mirroring analytics-lazy.
const HotspotView = dynamic(
  () => import('@/components/admin/hotspot-view').then((m) => ({ default: m.HotspotView })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4" aria-busy="true" aria-label="Loading hotspots">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[600px] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    ),
  },
)

export function HotspotLazy() {
  return <HotspotView />
}
