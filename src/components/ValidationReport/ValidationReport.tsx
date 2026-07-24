import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer } from '@/lib/motion'
import {
  byAbsoluteDeviation,
  byOutlierSeverity,
  orderedRungs,
  geometryLabel,
  hasReference,
  outlierStatus,
  recordElements,
  reportCompId,
  reportDepiction,
  reportElements,
  rungLabel,
} from '@/lib/cod'
import type { AngleRecord, AnalyseResponse, BondRecord } from '@/types/cod'
import { LigandViewer } from '@/components/LigandViewer'
import { RemediationPanel } from '@/components/RemediationPanel'
import { KINDS, type Kind } from './kinds'
import { GeometryRow } from './GeometryRow'
import { ElementFilter } from './ElementFilter'
import { useRemediation } from './RemediationContext'
import styles from './ValidationReport.module.css'

interface ValidationReportProps {
  report: AnalyseResponse
}

/** How the geometry rows are ordered. */
type SortKey = 'deviation' | 'sigma'

const SORTS: Record<
  SortKey,
  { label: string; compare: typeof byOutlierSeverity }
> = {
  deviation: { label: 'Absolute deviation (Δ)', compare: byAbsoluteDeviation },
  sigma: { label: 'Significance (σ)', compare: byOutlierSeverity },
}

/** Flat list, or grouped under rung headers. */
type ViewMode = 'list' | 'rung'

export function ValidationReport(props: ValidationReportProps) {
  const remediation = useRemediation()
  const [kind, setKind] = useState<Kind>('bonds')
  const [sortKey, setSortKey] = useState<SortKey>('deviation')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  // Elements the user has filtered to. Empty = no filter (show everything).
  const [elementFilter, setElementFilter] = useState<Set<string>>(new Set())

  const elements = useMemo(() => reportElements(props.report), [props.report])

  const sorted = useMemo(() => {
    const compare = SORTS[sortKey].compare
    // Keep records whose atoms include any selected element.
    const keep = (r: BondRecord | AngleRecord) =>
      elementFilter.size === 0 ||
      recordElements(r).some((el) => elementFilter.has(el))
    const bonds = props.report.bonds.filter(keep).sort(compare)
    const angles = props.report.angles.filter(keep).sort(compare)
    return { bonds, angles }
  }, [props.report, sortKey, elementFilter])

  function toggleElement(el: string) {
    setElementFilter((prev) => {
      const next = new Set(prev)
      if (next.has(el)) next.delete(el)
      else next.add(el)
      return next
    })
  }

  const outliers = useMemo(() => {
    const all = [...props.report.bonds, ...props.report.angles]
    return {
      bad: all.filter((r) => outlierStatus(r) === 'bad').length,
      warn: all.filter((r) => outlierStatus(r) === 'warn').length,
    }
  }, [props.report])

  const records = sorted[kind]
  const depiction = reportDepiction(props.report)

  return (
    <div className={styles.report}>
      <div className={styles.summary}>
        <div className={styles.summaryId}>
          <LigandViewer report={props.report} depiction={depiction} />
          <div>
            <span className={styles.ligand}>
              {reportCompId(props.report) ?? 'ligand'}
            </span>
            <span className={styles.summaryMeta}>
              {props.report.bonds.length} bonds · {props.report.angles.length}{' '}
              angles measured
            </span>
          </div>
        </div>
        <div className={styles.tallies}>
          <span className={`${styles.tally} ${styles.bad}`}>
            {outliers.bad} outliers
          </span>
          <span className={`${styles.tally} ${styles.warn}`}>
            {outliers.warn} borderline
          </span>
        </div>
      </div>

      {remediation.editMode && <RemediationPanel report={props.report} />}

      <div className={styles.tabs} role="tablist">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            className={`${styles.tab} ${kind === k ? styles.tabActive : ''}`}
            onClick={() => setKind(k)}
          >
            {KINDS[k].label} ({sorted[k].length})
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        {elements.length > 1 && (
          <ElementFilter
            elements={elements}
            selected={elementFilter}
            onToggle={toggleElement}
            onClear={() => setElementFilter(new Set())}
          />
        )}

        <div className={styles.sortControls}>
          <label className={styles.sortLabel}>
            Sort by
            <select
              className={styles.sortSelect}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {(Object.keys(SORTS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORTS[key].label}
                </option>
              ))}
            </select>
          </label>

          <div
            className={styles.viewToggle}
            role="tablist"
            aria-label="View mode"
          >
            {(['list', 'rung'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={viewMode === mode}
                className={`${styles.viewOption} ${
                  viewMode === mode ? styles.viewOptionActive : ''
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'list' ? 'List' : 'By rung'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <p className={styles.empty}>
          No {KINDS[kind].label.toLowerCase()} contain the selected element
          {elementFilter.size > 1 ? 's' : ''}.
        </p>
      ) : viewMode === 'list' ? (
        <motion.ul
          key={kind}
          className={styles.list}
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="visible"
        >
          {records.map((record, i) => (
            <GeometryRow
              key={`${geometryLabel(record)}-${i}`}
              record={record}
              kind={kind}
              defaultOpen={i === 0 && hasReference(record)}
            />
          ))}
        </motion.ul>
      ) : (
        <div className={styles.groups}>
          {orderedRungs(records).map((rung) => {
            const group = records.filter((r) => r.rung === rung)
            if (group.length === 0) return null
            return (
              <section key={rung} className={styles.group}>
                <header className={styles.groupHead}>
                  <span className={styles.groupTitle}>{rungLabel(rung)}</span>
                  <span className={styles.groupCount}>{group.length}</span>
                </header>
                <motion.ul
                  key={`${kind}-${rung}`}
                  className={styles.list}
                  variants={staggerContainer(0.04)}
                  initial="hidden"
                  animate="visible"
                >
                  {group.map((record, i) => (
                    <GeometryRow
                      key={`${geometryLabel(record)}-${i}`}
                      record={record}
                      kind={kind}
                      defaultOpen={false}
                    />
                  ))}
                </motion.ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
