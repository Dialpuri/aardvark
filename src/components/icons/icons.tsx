import styles from './icons.module.css'

/** Rounded square outline. */
export function SquareGlyph() {
  return <span className={styles.square} />
}

/** Three ascending bars (a tiny histogram). */
export function BarsGlyph() {
  return (
    <span className={styles.bars}>
      <span style={{ height: 10 }} />
      <span style={{ height: 16 }} />
      <span style={{ height: 8 }} />
    </span>
  )
}

/** Circle outline. */
export function CircleGlyph() {
  return <span className={styles.circle} />
}
