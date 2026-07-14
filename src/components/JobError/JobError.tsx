import { Button } from '@/components/Button'
import { JobFailedError, type FailureReason } from '@/lib/analyse'
import styles from './JobError.module.css'

interface JobErrorProps {
  /** The thrown error from the analysis query. */
  error: unknown
  /** Re-run the analysis. */
  onRetry: () => void
}

/** Reason-specific headline and guidance; falls back to the raw message. */
const COPY: Record<FailureReason, { title: string; hint: string }> = {
  TimedOut: {
    title: 'The job timed out',
    hint: 'The server took too long to finish. Larger or more flexible ligands can hit the time limit — retrying often clears it.',
  },
  JobProcessError: {
    title: 'ACEDRG couldn’t build a dictionary',
    hint: 'The structure was received but the dictionary build failed. Check the atoms and bonds are chemically sensible, then try again.',
  },
  SetupError: {
    title: 'The job couldn’t be set up',
    hint: 'Something went wrong preparing the job on the server before it could run.',
  },
}

export function JobError(props: JobErrorProps) {
  const failed = props.error instanceof JobFailedError ? props.error : null
  const copy = failed?.reason ? COPY[failed.reason] : null

  const title = copy?.title ?? 'Couldn’t analyse that structure'
  // Prefer tailored guidance; otherwise show the server's own message.
  const hint =
    copy?.hint ??
    failed?.message ??
    'The analysis didn’t complete. Please try again.'

  return (
    <div className={styles.wrap} role="alert">
      <span className={styles.glyph} aria-hidden>
        {/* A broken bond: two atoms, the bond between them snapped. */}
        <svg viewBox="0 0 64 24" width="64" height="24">
          <circle cx="8" cy="12" r="5" className={styles.atom} />
          <circle cx="56" cy="12" r="5" className={styles.atom} />
          <line x1="13" y1="12" x2="27" y2="12" className={styles.bond} />
          <line x1="37" y1="12" x2="51" y2="12" className={styles.bond} />
          <line x1="30" y1="5" x2="27" y2="19" className={styles.break} />
          <line x1="34" y1="5" x2="37" y2="19" className={styles.break} />
        </svg>
      </span>

      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.hint}>{hint}</p>
      </div>

      <Button variant="secondary" size="md" onClick={props.onRetry}>
        Try again
      </Button>
    </div>
  )
}
