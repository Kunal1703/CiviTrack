import type { Metadata } from 'next'
import { AdminOverview } from '@/components/admin/overview-view'

export const metadata: Metadata = {
  title: 'Admin · Overview',
  description: 'Municipal operations overview.',
}

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminOverview />
    </div>
  )
}
