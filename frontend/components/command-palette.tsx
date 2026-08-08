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
import { Home, Plus, List, BarChart3, Shield, Sun, Moon } from 'lucide-react'

/** Global ⌘K / Ctrl+K command palette. Also opens on a `command-palette:open` event. */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go('/')}>
            <Home className="mr-2 h-4 w-4" /> Home
          </CommandItem>
          <CommandItem onSelect={() => go('/report')}>
            <Plus className="mr-2 h-4 w-4" /> Report an issue
          </CommandItem>
          <CommandItem onSelect={() => go('/issues')}>
            <List className="mr-2 h-4 w-4" /> Browse issues
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard')}>
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics dashboard
          </CommandItem>
          <CommandItem onSelect={() => go('/admin')}>
            <Shield className="mr-2 h-4 w-4" /> Operations console
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
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
