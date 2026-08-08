'use client'

import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'

interface Props {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
}

/**
 * Counts up from 0 to `value` when scrolled into view (once). Used for KPI
 * counters and the confidence percentage. Respects reduced motion via the
 * global MotionConfig.
 */
export function AnimatedNumber({ value, duration = 1.1, decimals = 0, suffix = '', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => v.toFixed(decimals))

  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [inView, value, duration, mv])

  return (
    <span ref={ref} className={className}>
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  )
}
