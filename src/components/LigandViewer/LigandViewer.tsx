import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { cleanDepictionSvg, reportCompId } from '@/lib/cod'
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
 * click, opens a modal with 2D (the depiction SVG) and 3D (an interactive
 * gemmimol viewer) tabs.
 */
export function LigandViewer(props: LigandViewerProps) {
  const [open, setOpen] = useState(false)
  const label = reportCompId(props.report) ?? 'ligand'

  return (
    <>
      <button
        type="button"
        className={styles.thumb}
        onClick={() => setOpen(true)}
        aria-label={`Show ${label}`}
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
        depiction={props.depiction}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

/** Which view of the ligand the modal is showing. */
type ViewTab = '2d' | '3d'

interface LigandModalProps {
  open: boolean
  label: string
  report: AnalyseResponse
  /** 2D depiction SVG; when absent the modal shows only the 3D view. */
  depiction: string | null
  onClose: () => void
}

function LigandModal(props: LigandModalProps) {
  // Open on the 2D depiction (what the user clicked) when there is one; fall
  // back to 3D otherwise. The 3D view is always available via the mock/server.
  const [tab, setTab] = useState<ViewTab>(props.depiction ? '2d' : '3d')

  // Load coordinates only once the modal is open *and* the 3D tab is in view —
  // viewing only the 2D depiction needs no coordinate fetch.
  const coords = useQuery({
    queryKey: ['coordinates', props.report],
    queryFn: () => loadReportCoordinates(props.report),
    enabled: props.open && tab === '3d',
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
            aria-label={`${props.label} viewer`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.head}>
              <span className={styles.title}>{props.label}</span>
              {props.depiction && (
                <div className={styles.tabs} role="tablist">
                  {(['2d', '3d'] as ViewTab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                      onClick={() => setTab(t)}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={styles.close}
                onClick={props.onClose}
                aria-label="Close viewer"
              >
                ✕
              </button>
            </header>

            <div className={styles.body}>
              {tab === '2d' && props.depiction ? (
                <span
                  className={styles.depiction}
                  aria-label={`${props.label} 2D depiction`}
                  dangerouslySetInnerHTML={{
                    __html: cleanDepictionSvg(props.depiction),
                  }}
                />
              ) : coords.isSuccess ? (
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

            {tab === '3d' && (
              <p className={styles.hint}>Drag to rotate · scroll to zoom</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
