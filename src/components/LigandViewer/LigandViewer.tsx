import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { cleanDepictionSvg } from '@/lib/cod'
import { loadReportCoordinates } from '@/lib/coordinates'
import { MoleculeViewer } from '@/components/MoleculeViewer'
import type { AnalyseResponse } from '@/types/cod'
import styles from './LigandViewer.module.css'

interface LigandViewerProps {
  report: AnalyseResponse
  /** 2D depiction SVG shown in the collapsed thumbnail, if the report has one. */
  depiction: string | null
}

/**
 * The ligand thumbnail in the report summary. Shows the 2D depiction and, on
 * click, expands into an interactive gemmimol 3D viewer in a modal.
 */
export function LigandViewer(props: LigandViewerProps) {
  const [open, setOpen] = useState(false)
  const label = props.report.comp_id ?? 'ligand'

  return (
    <>
      <button
        type="button"
        className={styles.thumb}
        onClick={() => setOpen(true)}
        aria-label={`Show ${label} in 3D`}
      >
        {props.depiction ? (
          <span
            className={styles.thumbSvg}
            aria-hidden
            dangerouslySetInnerHTML={{
              __html: cleanDepictionSvg(props.depiction),
            }}
          />
        ) : (
          <span className={styles.thumbFallback} aria-hidden>
            3D
          </span>
        )}
        <span className={styles.thumbHint} aria-hidden>
          ⤢
        </span>
      </button>

      <LigandModal
        open={open}
        label={label}
        report={props.report}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

interface LigandModalProps {
  open: boolean
  label: string
  report: AnalyseResponse
  onClose: () => void
}

function LigandModal(props: LigandModalProps) {
  // Only load coordinates once the modal has actually been opened.
  const coords = useQuery({
    queryKey: ['coordinates', props.report],
    queryFn: () => loadReportCoordinates(props.report),
    enabled: props.open,
  })

  // Close on Escape while open.
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // Only re-run when the open state or close handler changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.onClose])

  return createPortal(
    <AnimatePresence>
      {props.open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={props.onClose}
        >
          <motion.div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={`${props.label} in 3D`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.head}>
              <span className={styles.title}>{props.label}</span>
              <button
                type="button"
                className={styles.close}
                onClick={props.onClose}
                aria-label="Close 3D view"
              >
                ✕
              </button>
            </header>

            <div className={styles.body}>
              {coords.isSuccess ? (
                <MoleculeViewer
                  text={coords.data.text}
                  name={coords.data.name}
                />
              ) : coords.isError ? (
                <p className={styles.message}>
                  Couldn’t load coordinates for this ligand.
                </p>
              ) : (
                <p className={styles.message}>Loading coordinates…</p>
              )}
            </div>

            <p className={styles.hint}>Drag to rotate · scroll to zoom</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
