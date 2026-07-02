import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Histogram, type HistogramStatus } from '@/components/Histogram'
import { floatIn, staggerContainer } from '@/lib/motion'
import {
  byOutlierSeverity,
  cleanDepictionSvg,
  geometryLabel,
  hasReference,
  histogramBins,
  outlierStatus,
  reportDepiction,
  rungDescription,
  rungLabel,
  statusLabel,
} from '@/lib/cod'
import type { AngleRecord, AnalyzeResponse, BondRecord } from '@/types/cod'
import styles from './ValidationReport.module.css'

interface ValidationReportProps {
  report: AnalyzeResponse
}

type Kind = 'bonds' | 'angles'

/** Per-kind display config: the unit and how to format a measured value. */
const KINDS: Record<
  Kind,
  {
    label: string
    unit: string
    axisLabel: string
    format: (n: number) => string
  }
> = {
  bonds: {
    label: 'Bonds',
    unit: ' Å',
    axisLabel: 'Bond length (Å)',
    format: (n) => n.toFixed(3),
  },
  angles: {
    label: 'Angles',
    unit: '°',
    axisLabel: 'Bond angle (°)',
    format: (n) => n.toFixed(1),
  },
}

export function ValidationReport(props: ValidationReportProps) {
  const [kind, setKind] = useState<Kind>('bonds')

  const sorted = useMemo(() => {
    const bonds = [...props.report.bonds].sort(byOutlierSeverity)
    const angles = [...props.report.angles].sort(byOutlierSeverity)
    return { bonds, angles }
  }, [props.report])

  const outliers = useMemo(() => {
    const all = [...props.report.bonds, ...props.report.angles]
    return {
      bad: all.filter((r) => outlierStatus(r.n_sigma) === 'bad').length,
      warn: all.filter((r) => outlierStatus(r.n_sigma) === 'warn').length,
    }
  }, [props.report])

  const records = sorted[kind]
  const depiction = reportDepiction(props.report)

  return (
    <div className={styles.report}>
      <div className={styles.summary}>
        <div className={styles.summaryId}>
          {depiction && (
            <span
              className={styles.summaryThumb}
              aria-hidden
              dangerouslySetInnerHTML={{ __html: cleanDepictionSvg(depiction) }}
            />
          )}
          <div>
            <span className={styles.ligand}>
              {props.report.comp_id ?? 'ligand'}
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
    </div>
  )
}

interface GeometryRowProps {
  record: BondRecord | AngleRecord
  kind: Kind
  defaultOpen: boolean
}

function GeometryRow(props: GeometryRowProps) {
  const [open, setOpen] = useState(props.defaultOpen)
  const record = props.record
  const cfg = KINDS[props.kind]
  const status = outlierStatus(record.n_sigma)
  const reference = hasReference(record)

  return (
    <motion.li className={styles.row} variants={floatIn}>
      <button
        className={styles.rowHead}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.atoms}>{geometryLabel(record)}</span>
        <span className={styles.value}>
          {cfg.format(record.value)}
          {cfg.unit}
        </span>
        <span className={`${styles.status} ${styles[status]}`}>
          {statusLabel[status]}
          {reference && record.n_sigma !== null && (
            <span className={styles.sigma}>
              {record.n_sigma > 0 ? '+' : ''}
              {record.n_sigma.toFixed(1)}σ
            </span>
          )}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          ›
        </span>
      </button>

      {open && (
        <div className={styles.detail}>
          {record.svg && (
            <section className={styles.panel}>
              <h4 className={styles.panelTitle}>Depiction</h4>
              <div
                className={styles.depiction}
                role="img"
                aria-label={`${geometryLabel(record)} highlighted on ${
                  props.record.atom_1
                }`}
                dangerouslySetInnerHTML={{
                  __html: cleanDepictionSvg(record.svg),
                }}
              />
            </section>
          )}

          <section className={styles.panel}>
            <h4 className={styles.panelTitle}>
              Reference distribution
              {reference && (
                <span className={styles.panelMeta}>
                  {record.N.toLocaleString()} COD observations
                </span>
              )}
            </h4>
            {reference ? (
              <>
                <dl className={styles.figures}>
                  <div>
                    <dt>COD mean</dt>
                    <dd>
                      {cfg.format(record.mean!)}
                      {cfg.unit} ± {cfg.format(record.sd!)}
                    </dd>
                  </div>
                  <div>
                    <dt>This value</dt>
                    <dd>
                      {cfg.format(record.value)}
                      {cfg.unit}
                    </dd>
                  </div>
                  <div>
                    <dt>Match</dt>
                    <dd title={rungDescription[record.rung]}>
                      {rungLabel[record.rung]}
                    </dd>
                  </div>
                </dl>
                <Histogram
                  className={styles.histogram}
                  bins={histogramBins(record.histogram)}
                  value={record.value}
                  status={status as HistogramStatus}
                  unit={cfg.unit.trim()}
                  format={cfg.format}
                  axisLabel={cfg.axisLabel}
                  label={`${geometryLabel(record)} vs. ${record.N} COD observations`}
                />
              </>
            ) : (
              <p className={styles.noReference}>
                No reference distribution — matched by {rungLabel[record.rung]}{' '}
                only, so this geometry can’t be scored.
              </p>
            )}
          </section>
        </div>
      )}
    </motion.li>
  )
}
