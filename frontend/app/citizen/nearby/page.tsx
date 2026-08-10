import type { Metadata } from 'next'
import { CitizenPageHeader } from '@/components/citizen/citizen-page-header'
import { NearbyView } from '@/components/citizen/nearby-view'

export const metadata: Metadata = {
  title: 'Nearby',
  description: 'Civic issues reported across Delhi, on a map with hotspot density.',
}

export default function NearbyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <CitizenPageHeader
        icon="nearby"
        title="Around Delhi"
        description="See what’s being reported across the city. Switch to hotspots to find areas with the most activity."
      />
      <NearbyView />
    </div>
  )
}
