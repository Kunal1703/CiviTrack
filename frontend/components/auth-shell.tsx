'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

/**
 * Centered, full-height frame for the login/register screens. Reuses the app's
 * ambient aurora + glass language so auth feels part of the product, not bolted
 * on. Navbar is hidden on these routes (see Navbar).
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-[calc(100vh-0px)] items-center justify-center overflow-hidden px-4 py-12">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-32 left-1/4 h-[34rem] w-[34rem] rounded-full bg-primary/20 blur-[130px]"
          animate={{ y: [0, 26, 0], x: [0, 18, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-8rem] right-1/4 h-[30rem] w-[30rem] rounded-full bg-accent/20 blur-[130px]"
          animate={{ y: [0, -22, 0], x: [0, -16, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              CiviTrack <span className="text-primary">AI</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">{subtitle}</p>
        </div>

        <div className="glass rounded-2xl border border-border/70 p-6 shadow-premium sm:p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </motion.div>
    </div>
  )
}
