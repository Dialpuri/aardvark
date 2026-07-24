import { useRemediation } from './RemediationContext'
import styles from './ValidationReport.module.css'

/** View ⇄ Edit restraints segmented control. Sits on the report title row. */
export function ReportModeToggle() {
  const remediation = useRemediation()

  return (
    <div className={styles.modeToggle} role="tablist" aria-label="Report mode">
      <button
        role="tab"
        aria-selected={!remediation.editMode}
        className={`${styles.modeOption} ${
          !remediation.editMode ? styles.modeOptionActive : ''
        }`}
        onClick={() => remediation.setEditMode(false)}
      >
        View
      </button>
      <button
        role="tab"
        aria-selected={remediation.editMode}
        className={`${styles.modeOption} ${
          remediation.editMode ? styles.modeOptionActive : ''
        }`}
        onClick={() => remediation.setEditMode(true)}
      >
        Edit restraints
        {remediation.edits.size > 0 && (
          <span className={styles.modeBadge}>{remediation.edits.size}</span>
        )}
      </button>
    </div>
  )
}
