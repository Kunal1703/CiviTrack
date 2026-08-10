import type { Metadata } from 'next'
import { CitizenDashboard } from '@/components/citizen/dashboard-view'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your CiviTrack home — report civic issues in Delhi and track their progress.',
}

export default function CitizenHomePage() {
  return <CitizenDashboard />
}
