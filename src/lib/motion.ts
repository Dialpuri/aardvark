import type { Transition, Variants } from 'framer-motion'

const ease: Transition['ease'] = [0.16, 1, 0.3, 1]

/** "floatIn" — fade up, used for page/hero sections. */
export const floatIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}

/** "chipIn" — fade up + slight scale, used for floating annotation chips. */
export const chipIn: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } },
}

/**
 * Stagger container: children with `variants` animate in sequence.
 * Pair with `floatIn`/`chipIn` on the children.
 */
export function staggerContainer(stagger = 0.08, delay = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  }
}
