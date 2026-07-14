import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { JobProgress } from '@/lib/analyse'
import styles from './JobStatus.module.css'

interface JobStatusProps {
  /** Latest progress report for the running job, or null before the first one. */
  progress: JobProgress | null
}

/** `1 → "1st"`, `2 → "2nd"`, … for the queue-position copy. */
function ordinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]}`
}

/** How many people are ahead of you, capped so the row stays a sensible width. */
const MAX_DOTS = 9

/** Bell-shaped bar heights (0–1) for the distribution indicator. */
const CURVE = [0.22, 0.4, 0.62, 0.85, 1, 0.85, 0.62, 0.4, 0.22]

/** How long each fact stays up, in ms. */
const FACT_INTERVAL = 7000

/**
 * Real geometry the app is about to measure — grounded, checkable, and a little
 * delightful. Kept end-user-friendly: no jargon that needs the report to parse.
 */
const FACTS = [
  'A carbon–carbon single bond is about 1.54 Å long — roughly a seven-billionth of the width of your thumb.',
  'The Crystallography Open Database holds over 500,000 published structures, all free to reuse.',
  'Every bond at a tetrahedral carbon meets near 109.5° — the shape that lets methane sit perfectly symmetric.',
  "Benzene's six carbon–carbon bonds are all 1.39 Å, sitting exactly between a single and a double bond.",
  "Water isn't square: its H–O–H angle is 104.5°, bent by the oxygen's two lone pairs.",
  'One Ångström is a tenth of a nanometre — the ruler chosen because most bonds land between 1 and 2 of them.',
  'Diamond and graphite are both pure carbon. Everything that tells them apart is bond length and angle.',
  'A peptide bond is flat: the six atoms around it lie in almost exactly the same plane.',
]

/**
 * The waiting state shown while a job is queued or running: a live distribution
 * indicator, the current status, a queue readout when relevant, and a rotating
 * geometry fact to read while ACEDRG works.
 */
export function JobStatus(props: JobStatusProps) {
  const queued = props.progress?.status === 'Queued'
  const position = props.progress?.queue_position ?? null

  const headline = queued ? 'In the queue' : 'Running AARDVARK'
  const detail = queued
    ? queueDetail(position)
    : 'Building the ACEDRG dictionary and scoring geometry against the COD…'

  // dots[0] is the front of the line (being served); the last dot is you.
  const lineLength = position === null ? 0 : Math.min(position + 1, MAX_DOTS)
  const dots = Array.from({ length: lineLength }, (_, i) => ({
    fromBack: lineLength - 1 - i, // 0 === you, stable as the line shrinks
  }))

  // Start on a random fact so repeat visits don't always open the same way.
  const [fact, setFact] = useState(() =>
    Math.floor(Math.random() * FACTS.length),
  )
  useEffect(() => {
    const id = setInterval(
      () => setFact((f) => (f + 1) % FACTS.length),
      FACT_INTERVAL,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.live} role="status" aria-live="polite">
        <div className={styles.curve} aria-hidden>
          {CURVE.map((h, i) => (
            <span
              key={i}
              className={styles.bar}
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.11}s` }}
            />
          ))}
        </div>

        <div className={styles.text}>
          <p className={styles.headline}>{headline}</p>
          <p className={styles.detail}>{detail}</p>
        </div>

        {queued && lineLength > 0 && (
          <div className={styles.queue} aria-hidden>
            {position !== null && position + 1 > MAX_DOTS && (
              <span className={styles.more}>…</span>
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {dots.map((dot, i) => (
                <motion.span
                  key={dot.fromBack}
                  layout
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`${styles.dot} ${
                    dot.fromBack === 0 ? styles.you : ''
                  } ${i === 0 ? styles.serving : ''}`}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <figure className={styles.fact}>
        <span className={styles.factMark} aria-hidden />
        <div className={styles.factBody}>
          <figcaption className={styles.factLabel}>While you wait</figcaption>
          <AnimatePresence mode="wait">
            <motion.p
              key={fact}
              className={styles.factText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {FACTS[fact]}
            </motion.p>
          </AnimatePresence>
        </div>
      </figure>
    </div>
  )
}

/** The line under the headline while queued. */
function queueDetail(position: number | null): string {
  if (position === null) return 'Waiting for a free slot on the server…'
  if (position === 0) return "You're next in line — hang tight."
  return `${ordinal(position + 1)} in line — we'll start automatically.`
}
