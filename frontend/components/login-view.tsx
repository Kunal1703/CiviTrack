'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/auth-shell'
import { useAuth } from '@/components/auth-provider'
import { roleHome } from '@/lib/auth-api'

export function LoginView() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(email, password)
      const next = params.get('next')
      router.replace(next && next.startsWith('/') ? next : roleHome(user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to report issues and track their progress."
      footer={
        <>
          New to CiviTrack?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full gap-2 shadow-glow" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
