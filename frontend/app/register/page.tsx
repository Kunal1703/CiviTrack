import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RegisterView } from '@/components/register-view'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a CiviTrack AI account to report civic issues.',
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterView />
    </Suspense>
  )
}
