'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MapPin, Plus, List, BarChart3, Menu, Shield, Home, Search } from 'lucide-react'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Report', href: '/report', icon: Plus },
  { name: 'Issues', href: '/issues', icon: List },
  { name: 'Analytics', href: '/dashboard', icon: BarChart3 },
  { name: 'Admin', href: '/admin', icon: Shield },
]

function openPalette() {
  window.dispatchEvent(new Event('command-palette:open'))
}

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="glass sticky top-0 z-50 w-full border-b border-border/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
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
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
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
          <Button asChild size="sm" className="gap-2">
            <Link href="/report">
              <Plus className="h-4 w-4" />
              Report
            </Link>
          </Button>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  )
}
