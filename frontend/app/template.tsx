'use client'

import { motion } from 'framer-motion'

/**
 * Route template — re-mounts on navigation, giving every page a subtle,
 * consistent enter transition. Kept understated so it reads as polish, not
 * spectacle (and it's disabled under prefers-reduced-motion via MotionConfig).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
