'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/auth-shell'
import { useAuth } from '@/components/auth-provider'
import { roleHome } from '@/lib/auth-api'

export function RegisterView() {
  const router = useRouter()
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      const user = await register({
        full_name: fullName,
        email,
        password,
        admin_code: adminCode.trim() || undefined,
      })
      router.replace(roleHome(user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join CiviTrack to report civic issues and follow them to resolution."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aisha Sharma"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {/* Optional admin invite code — collapsed by default. */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdmin((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showAdmin}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdmin ? 'rotate-180' : ''}`} />
            I have a municipal admin code
          </button>
          {showAdmin && (
            <div className="mt-2 space-y-2">
              <Label htmlFor="admin_code" className="sr-only">
                Admin invite code
              </Label>
              <Input
                id="admin_code"
                autoComplete="off"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Admin invite code (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to register as a citizen. A valid code provisions a municipal
                administrator account.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full gap-2 shadow-glow" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
