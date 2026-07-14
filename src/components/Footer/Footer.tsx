import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.wrap}>
      <div className={styles.inner}>
        <span className={styles.version}>
          AARDVARK · Open dictionary validation for small molecules using ACEDRG
          and COD · v0.0
        </span>
      </div>
      <div className={styles.inner}>
        <span className={styles.version}>
          {/*J. Dialpuri, J. Smulski, F. Long, G. Murshudov, P. Emsley · */}
          MRC Laboratory of Molecular Biology, Cambridge
        </span>
      </div>
    </footer>
  )
}
