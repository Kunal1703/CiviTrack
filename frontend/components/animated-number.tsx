'use client'

import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'

interface Props {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
  /** Animate on mount instead of waiting to scroll into view (for above-the-fold KPIs). */
  immediate?: boolean
}

/**
 * Counts up from 0 to `value` when scrolled into view (once) — or immediately,
 * for above-the-fold counters. Respects reduced motion via the global
 * MotionConfig. Falls back to showing the final value if animation never runs.
 */
export function AnimatedNumber({ value, duration = 1.1, decimals = 0, suffix = '', className, immediate = false }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => v.toFixed(decimals))
  const active = immediate || inView

  useEffect(() => {
    if (!active) return
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [active, value, duration, mv])

  return (
    <span ref={ref} className={className}>
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  )
}
