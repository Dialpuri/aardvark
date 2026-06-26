import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Add the large hero drop shadow. */
  elevated?: boolean
}

export function Card({
  children,
  elevated = false,
  className,
  ...rest
}: CardProps) {
  const cls = [styles.card, elevated ? styles.elevated : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}
