'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'
import { CommandPalette } from '@/components/command-palette'

/**
 * App-wide client providers: theme (class strategy for Tailwind dark mode) and
 * Framer Motion config. `reducedMotion="user"` honors prefers-reduced-motion
 * globally, so every animation degrades gracefully for accessibility.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        {children}
        <CommandPalette />
      </MotionConfig>
    </NextThemesProvider>
  )
}
