'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useAuth } from '@/components/auth-provider'
import {
  Home, Plus, List, BarChart3, Shield, Sun, Moon, MapPin, ClipboardList, LogIn,
  UserPlus, Cpu, LogOut,
} from 'lucide-react'

type Item = { label: string; href?: string; icon: React.ComponentType<{ className?: string }>; action?: () => void }

/** Global ⌘K / Ctrl+K command palette. Role-aware navigation. */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { user, logout } = useAuth()

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('command-palette:open', onOpen)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('command-palette:open', onOpen)
    }
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const nav: Item[] =
    user?.role === 'admin'
      ? [
          { label: 'Overview', href: '/admin', icon: Shield },
          { label: 'Issue queue', href: '/admin/issues', icon: List },
          { label: 'Issue map', href: '/admin/map', icon: MapPin },
          { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        ]
      : user?.role === 'citizen'
        ? [
            { label: 'Home', href: '/citizen', icon: Home },
            { label: 'Report an issue', href: '/citizen/report', icon: Plus },
            { label: 'My reports', href: '/citizen/reports', icon: ClipboardList },
            { label: 'Nearby', href: '/citizen/nearby', icon: MapPin },
          ]
        : [
            { label: 'Home', href: '/', icon: Home },
            { label: 'Sign in', href: '/login', icon: LogIn },
            { label: 'Create account', href: '/register', icon: UserPlus },
          ]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {nav.map((item) => (
            <CommandItem key={item.label} onSelect={() => go(item.href!)}>
              <item.icon className="mr-2 h-4 w-4" /> {item.label}
            </CommandItem>
          ))}
          <CommandItem onSelect={() => go('/architecture')}>
            <Cpu className="mr-2 h-4 w-4" /> How it’s built
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Preferences">
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
              setOpen(false)
            }}
          >
            {resolvedTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle theme
          </CommandItem>
          {user && (
            <CommandItem
              onSelect={async () => {
                setOpen(false)
                await logout()
                router.replace('/')
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
