'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/components/auth-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { roleHome } from '@/lib/auth-api'
import {
  MapPin, Plus, List, BarChart3, Menu, Shield, Home, Search, LogIn, LogOut, User,
  ClipboardList,
} from 'lucide-react'

// Public (logged-out) nav.
const publicNav = [{ name: 'Home', href: '/', icon: Home }]

// Citizen product nav.
const citizenNav = [
  { name: 'Home', href: '/citizen', icon: Home },
  { name: 'Report', href: '/citizen/report', icon: Plus },
  { name: 'My Reports', href: '/citizen/reports', icon: ClipboardList },
  { name: 'Nearby', href: '/citizen/nearby', icon: MapPin },
]

// Admin operational workspace nav.
const adminNav = [
  { name: 'Overview', href: '/admin', icon: Shield },
  { name: 'Issues', href: '/admin/issues', icon: List },
  { name: 'Map', href: '/admin/map', icon: MapPin },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

function openPalette() {
  window.dispatchEvent(new Event('command-palette:open'))
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Auth screens are full-bleed — no app chrome.
  if (pathname === '/login' || pathname === '/register') return null

  // Role-specific navigation (the server enforces access regardless of what's shown).
  const navigation = user?.role === 'admin' ? adminNav : user?.role === 'citizen' ? citizenNav : publicNav
  const homeHref = user ? roleHome(user.role) : '/'

  async function onLogout() {
    await logout()
    router.replace('/')
  }

  return (
    <header className="glass sticky top-0 z-50 w-full border-b border-border/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            CiviTrack <span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navigation.map((item) => {
            // Role roots ('/', '/admin', '/citizen') match exactly so they don't
            // stay highlighted on their subpages.
            const exact = item.href === '/' || item.href === '/admin' || item.href === '/citizen'
            const isActive = exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-0 rounded-md bg-primary/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right cluster */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <button
            onClick={openPalette}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 py-1.5 pl-3 pr-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="max-w-[10rem] truncate">{user.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate">{user.email}</span>
                  <span className="text-xs font-normal capitalize text-muted-foreground">
                    {user.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="gap-2">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1 md:hidden">
          <button onClick={openPalette} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted">
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {navigation.map((item) => (
                <DropdownMenuItem key={item.name} asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  )
}
