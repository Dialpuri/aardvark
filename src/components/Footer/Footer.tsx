import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.wrap}>
      <div className={styles.inner}>
        <span>
          AARDVARK · Open dictionary validation for small molecules using ACEDRG
          and COD.
        </span>
        <span className={styles.version}>
          v0.0 · MRC Laboratory of Molecular Biology
        </span>
      </div>
    </footer>
  )
}
