import type { Metadata } from 'next'
import { HotspotLazy } from '@/components/admin/hotspot-lazy'

export const metadata: Metadata = {
  title: 'Admin · Hotspot intelligence',
  description: 'Statistically significant NYC 311 complaint hotspots (Getis-Ord Gi*).',
}

export default function AdminHotspotsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Hotspot intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where complaints cluster more than chance would predict — statistically significant
          hotspots on the NYC 311 corpus, by category and month.
        </p>
      </div>
      <HotspotLazy />
    </div>
  )
}
