import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.wrap}>
      <div className={styles.inner}>
        <span>Geometra · Free geometry validation for small molecules.</span>
        <span className={styles.version}>v1.0 · built for chemists</span>
      </div>
    </footer>
  )
}
