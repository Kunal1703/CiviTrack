import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginView } from '@/components/login-view'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to CiviTrack AI to report and track civic issues.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  )
}
