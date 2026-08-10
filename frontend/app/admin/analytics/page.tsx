import type { Metadata } from 'next'
import { AnalyticsLazy } from '@/components/admin/analytics-lazy'

export const metadata: Metadata = {
  title: 'Admin · Analytics',
  description: 'Operational analytics for municipal complaints.',
}

export default function AdminAnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Volume, categories, status, and resolution performance — from real complaint data.
        </p>
      </div>
      <AnalyticsLazy />
    </div>
  )
}
