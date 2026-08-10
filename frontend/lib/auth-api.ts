/**
 * Auth client for the CiviTrack AI gateway. Requests go to same-origin `/api/*`
 * (proxied to the FastAPI gateway) and rely on httpOnly session cookies — the
 * frontend never sees or stores the JWTs.
 */

export type Role = 'citizen' | 'admin'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: Role
  created_at: string
}

export interface RegisterInput {
  email: string
  password: string
  full_name: string
  admin_code?: string
}

async function detail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    /* non-JSON body */
  }
  return fallback
}

/** Current user, or null when unauthenticated (401). Throws on other errors. */
export async function apiMe(signal?: AbortSignal): Promise<AuthUser | null> {
  const res = await fetch('/api/v1/auth/me', { credentials: 'include', signal })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(await detail(res, 'Failed to load session'))
  return (await res.json()) as AuthUser
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await detail(res, 'Invalid email or password'))
  return (await res.json()) as AuthUser
}

export async function apiRegister(input: RegisterInput): Promise<AuthUser> {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await detail(res, 'Could not create account'))
  return (await res.json()) as AuthUser
}

export async function apiLogout(): Promise<void> {
  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
}

/** Where a role lands after auth. */
export function roleHome(role: Role): string {
  return role === 'admin' ? '/admin' : '/citizen'
}
