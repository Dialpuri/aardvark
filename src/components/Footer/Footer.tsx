import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.wrap}>
      <div className={styles.inner}>
        <span>
          AARDVARK · Free geometry validation for small molecules using ACEDRG.
        </span>
        <span className={styles.version}>v0.0 · built for everyone</span>
      </div>
    </footer>
  )
}
