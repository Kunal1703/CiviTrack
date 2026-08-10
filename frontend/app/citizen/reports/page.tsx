import type { Metadata } from 'next'
import { CitizenPageHeader } from '@/components/citizen/citizen-page-header'
import { MyReportsView } from '@/components/citizen/my-reports-view'

export const metadata: Metadata = {
  title: 'My reports',
  description: 'All the civic issues you have reported, and their current status.',
}

export default function MyReportsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <CitizenPageHeader
        icon="reports"
        title="My reports"
        description="Everything you’ve reported, with live status. Search, filter, and open any report for details."
      />
      <MyReportsView />
    </div>
  )
}
