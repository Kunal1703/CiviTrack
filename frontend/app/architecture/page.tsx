import type { Metadata } from 'next'
import { ArchitectureView } from '@/components/architecture-view'

export const metadata: Metadata = {
  title: 'How it’s built',
  description: 'The architecture and machine learning behind CiviTrack AI — and an honest note on the data.',
}

export default function ArchitecturePage() {
  return <ArchitectureView />
}
