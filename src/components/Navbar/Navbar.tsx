import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import styles from './Navbar.module.css'

interface NavbarProps {
  /** Right-hand content (links, CTA, back button…). */
  children?: ReactNode
}

export function Navbar({ children }: NavbarProps) {
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand} aria-label="Geometra home">
        <Logo />
      </Link>
      <div className={styles.right}>{children}</div>
    </nav>
  )
}
