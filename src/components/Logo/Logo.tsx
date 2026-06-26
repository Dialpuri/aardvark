import styles from './Logo.module.css'

interface LogoProps {
  /** Side length of the badge in px. */
  size?: number
  /** Show the "Geometra" wordmark next to the badge. */
  withWordmark?: boolean
}

export function Logo({ size = 32, withWordmark = true }: LogoProps) {
  return (
    <span className={styles.logo}>
      <span
        className={styles.badge}
        style={{ width: size, height: size, borderRadius: size * 0.28 }}
      >
        <span
          className={styles.diamond}
          style={{ width: size * 0.4, height: size * 0.4 }}
        />
      </span>
      {withWordmark && <span className={styles.wordmark}>AARDVARK</span>}
    </span>
  )
}
