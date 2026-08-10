import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Role-aware route protection.
 *
 * IMPORTANT: this is a convenience/UX layer only. It reads the session cookie to
 * redirect the browser sensibly, but it does NOT verify the JWT signature — the
 * FastAPI gateway independently authenticates and authorizes every protected API
 * call. A tampered cookie gets a user nowhere: the gateway rejects it.
 */

const ACCESS_COOKIE = 'ct_access'

interface SessionClaims {
  role?: 'citizen' | 'admin'
  exp?: number
}

function readClaims(token: string | undefined): SessionClaims | null {
  if (!token) return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as SessionClaims
    if (claims.exp && Date.now() / 1000 > claims.exp) return null // expired
    return claims
  } catch {
    return null
  }
}

// Role landing targets.
const ADMIN_HOME = '/admin'
const CITIZEN_HOME = '/citizen'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const claims = readClaims(req.cookies.get(ACCESS_COOKIE)?.value)

  const onAuthPage = pathname === '/login' || pathname === '/register'
  const wantsAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const wantsCitizen = pathname === '/citizen' || pathname.startsWith('/citizen/')

  // Signed-in users shouldn't sit on the login/register screens.
  if (onAuthPage && claims) {
    return NextResponse.redirect(
      new URL(claims.role === 'admin' ? ADMIN_HOME : CITIZEN_HOME, req.url),
    )
  }

  if (wantsAdmin || wantsCitizen) {
    if (!claims) {
      const url = new URL('/login', req.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    // Role gate: citizens can't enter admin areas and vice-versa.
    if (wantsAdmin && claims.role !== 'admin') {
      return NextResponse.redirect(new URL(CITIZEN_HOME, req.url))
    }
    if (wantsCitizen && claims.role !== 'citizen') {
      return NextResponse.redirect(new URL(ADMIN_HOME, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/citizen', '/citizen/:path*', '/login', '/register'],
}
