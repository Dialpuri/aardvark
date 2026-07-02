import { Fragment } from 'react'
import styles from './Logo.module.css'

/** Source words of the acronym; the leading letter of each spells AARDVARK. */
const EXPANSION = [
  'Acedrg',
  'Atom-type',
  'Reference',
  'Data',
  'Validation',
  'And',
  'Reporting',
  'Kit',
]

interface LogoProps {
  /** Side length of the badge in px. */
  size?: number
  /** Show the "AARDVARK" wordmark next to the badge. */
  withWordmark?: boolean
  /** Show the expanded acronym under the wordmark. */
  withExpansion?: boolean
}

export function Logo({
  size = 32,
  withWordmark = true,
  withExpansion = true,
}: LogoProps) {
  return (
    <span className={styles.logo}>
      <span
        className={styles.badge}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      >
        <span
          className={styles.diamond}
          style={{ width: size * 0.4, height: size * 0.4 }}
        />
      </span>
      {withWordmark && (
        <span className={styles.wordmarkGroup}>
          <span className={styles.wordmark}>AARDVARK</span>
          {withExpansion && (
            <span className={styles.expansion} aria-label={EXPANSION.join(' ')}>
              {EXPANSION.map((word, i) => (
                <Fragment key={word}>
                  {i > 0 && ' '}
                  <span aria-hidden className={styles.initial}>
                    {word[0]}
                  </span>
                  {word.slice(1)}
                </Fragment>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
