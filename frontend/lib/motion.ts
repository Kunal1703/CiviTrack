import type { Variants, Transition } from 'framer-motion'

/**
 * Shared motion primitives — the single source of animation truth so every
 * screen feels part of one system. Easing is a soft "ease-out-expo" curve used
 * across entrances, hovers, and transitions.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30 }

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } },
}

/** Parent container that staggers its children's entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

/** Standard card hover: subtle lift. Pair with `whileHover`. */
export const hoverLift = { y: -4, transition: { duration: 0.25, ease: EASE_OUT } }
