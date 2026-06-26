import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { floatIn } from '@/lib/motion'
import { Card } from '@/components/Card'
import styles from './FeatureCard.module.css'

interface FeatureCardProps {
  /** Small glyph shown inside the tinted icon tile. */
  icon: ReactNode
  title: string
  children: ReactNode
}

export function FeatureCard({ icon, title, children }: FeatureCardProps) {
  return (
    <motion.div variants={floatIn}>
      <Card>
        <span className={styles.iconTile}>{icon}</span>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{children}</p>
      </Card>
    </motion.div>
  )
}
