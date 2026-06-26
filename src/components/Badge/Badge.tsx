import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
  /** Color of the leading status dot. Omit to hide the dot. */
  dot?: string
}

export function Badge({ children, dot }: BadgeProps) {
  return (
    <span className={styles.badge}>
      {dot && <span className={styles.dot} style={{ background: dot }} />}
      {children}
    </span>
  )
}
