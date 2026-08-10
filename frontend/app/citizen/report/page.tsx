import type { Metadata } from 'next'
import { CitizenPageHeader } from '@/components/citizen/citizen-page-header'
import { CitizenReportForm } from '@/components/citizen/report-form'

export const metadata: Metadata = {
  title: 'Report an issue',
  description: 'Report a civic issue in Delhi. We suggest a category automatically as you type.',
}

export default function CitizenReportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <CitizenPageHeader
        icon="report"
        title="Report an issue"
        description="Describe the problem in your own words — we’ll suggest a category and check for similar reports nearby."
      />
      <CitizenReportForm />
    </div>
  )
}
