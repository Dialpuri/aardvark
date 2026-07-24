import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { floatIn } from '@/lib/motion'
import { reportCompId } from '@/lib/cod'
import {
  buildCifPatch,
  formatAt,
  targetDelta,
  type RemediationEdit,
} from '@/lib/remediation'
import { KINDS } from '@/components/ValidationReport/kinds'
import { useRemediation } from '@/components/ValidationReport/RemediationContext'
import type { AnalyseResponse } from '@/types/cod'
import styles from './RemediationPanel.module.css'

interface RemediationPanelProps {
  report: AnalyseResponse
}

const SOURCE_LABEL: Record<RemediationEdit['source'], string> = {
  'cod-mean': 'COD mean',
  custom: 'custom',
}

/** Push a generated CIF fragment to the browser as a file download. */
function downloadCif(filename: string, cif: string) {
  const blob = new Blob([cif], { type: 'chemical/x-cif' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * The change tracker shown below the summary while in edit mode: a live list of
 * every restraint override, each revertable, plus a download of the patched
 * restraints CIF. Reads pending edits from {@link useRemediation}.
 */
export function RemediationPanel(props: RemediationPanelProps) {
  const remediation = useRemediation()

  const edits = useMemo(
    () =>
      [...remediation.edits.values()].sort(
        (a, b) =>
          a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label),
      ),
    [remediation.edits],
  )

  function onDownload() {
    const cif = buildCifPatch(props.report, edits)
    if (!cif) return
    const compId = reportCompId(props.report) ?? 'ligand'
    downloadCif(`${compId}-remediated.cif`, cif)
  }

  return (
    <motion.section
      className={styles.panel}
      variants={floatIn}
      initial="hidden"
      animate="visible"
      aria-label="Restraint changes"
    >
      <header className={styles.head}>
        <div className={styles.heading}>
          <h2 className={styles.title}>Restraint changes</h2>
          <span className={styles.count}>
            {edits.length === 0
              ? 'none yet'
              : `${edits.length} change${edits.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.download}
            onClick={onDownload}
            disabled={edits.length === 0}
          >
            Download patched CIF
          </button>
          <button
            type="button"
            className={styles.resetAll}
            onClick={() => remediation.revertAll()}
            disabled={edits.length === 0}
          >
            Reset all
          </button>
        </div>
      </header>

      {edits.length === 0 ? (
        <p className={styles.empty}>
          No changes yet. Expand a bond or angle and adjust its target to
          remediate the restraint dictionary.
        </p>
      ) : (
        <ul className={styles.list}>
          {edits.map((edit) => {
            const cfg = KINDS[edit.kind]
            const delta = targetDelta(edit)
            const esdChanged =
              formatAt(edit.kind, edit.esd) !==
              formatAt(edit.kind, edit.original.esd)
            return (
              <li key={edit.key} className={styles.item}>
                <span className={styles.atoms}>{edit.label}</span>
                <span className={styles.change}>
                  <span className={styles.changeLine}>
                    <span className={styles.field}>value</span>
                    <span className={styles.from}>
                      {formatAt(edit.kind, edit.original.value)}
                    </span>
                    <span className={styles.arrow} aria-hidden>
                      →
                    </span>
                    <span className={styles.to}>
                      {formatAt(edit.kind, edit.value)}
                      {cfg.unit}
                    </span>
                    {delta !== 0 && (
                      <span
                        className={`${styles.delta} ${
                          delta > 0 ? styles.up : styles.down
                        }`}
                      >
                        {formatAt(edit.kind, delta, true)}
                      </span>
                    )}
                  </span>
                  {esdChanged && (
                    <span className={`${styles.changeLine} ${styles.esdLine}`}>
                      <span className={styles.field}>esd</span>
                      <span className={styles.from}>
                        {formatAt(edit.kind, edit.original.esd)}
                      </span>
                      <span className={styles.arrow} aria-hidden>
                        →
                      </span>
                      <span className={styles.to}>
                        {formatAt(edit.kind, edit.esd)}
                        {cfg.unit}
                      </span>
                    </span>
                  )}
                </span>
                <span className={styles.source}>
                  {SOURCE_LABEL[edit.source]}
                </span>
                <button
                  type="button"
                  className={styles.revert}
                  onClick={() => remediation.revertEdit(edit.key)}
                  aria-label={`Revert ${edit.label}`}
                >
                  Revert
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )
}
