import type { Metadata } from 'next'
import { AdminMapView } from '@/components/admin/admin-map-view'

export const metadata: Metadata = {
  title: 'Admin · Map',
  description: 'Geographic view of civic issues across Delhi.',
}

export default function AdminMapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Issue map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where issues are concentrated across Delhi. Filter by category or status, or switch to hotspots.
        </p>
      </div>
      <AdminMapView />
    </div>
  )
}
