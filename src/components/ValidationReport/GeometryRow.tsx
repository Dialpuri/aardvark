import { useState } from 'react'
import { motion } from 'framer-motion'
import { Histogram, type HistogramStatus } from '@/components/Histogram'
import { floatIn } from '@/lib/motion'
import {
  cleanDepictionSvg,
  geometryLabel,
  hasReference,
  histogramBins,
  outlierStatus,
  rungDescription,
  rungLabel,
  statusLabel,
} from '@/lib/cod'
import type { AngleRecord, BondRecord } from '@/types/cod'
import { KINDS, type Kind } from './kinds'
import { ObservationList } from './ObservationList'
import styles from './ValidationReport.module.css'

interface GeometryRowProps {
  record: BondRecord | AngleRecord
  kind: Kind
  defaultOpen: boolean
}

/** One bond/angle: a summary head that expands to depiction, distribution and
 * the underlying COD observations. */
export function GeometryRow(props: GeometryRowProps) {
  const [open, setOpen] = useState(props.defaultOpen)
  const [obsOpen, setObsOpen] = useState(false)
  const [meanHover, setMeanHover] = useState(false)
  const record = props.record
  const cfg = KINDS[props.kind]
  const status = outlierStatus(record)
  const reference = hasReference(record)
  const obs = record.obs ?? []

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
            <span className={styles.metrics}>
              <span className={styles.metric}>
                {record.n_sigma > 0 ? '+' : ''}
                {record.n_sigma.toFixed(1)}σ
              </span>
              {record.delta !== null && (
                <span className={styles.metric}>
                  {record.delta > 0 ? '+' : ''}
                  {cfg.format(record.delta)}
                  {cfg.unit}
                </span>
              )}
            </span>
          )}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          ›
        </span>
      </button>

      {open && (
        <div className={styles.detail}>
          <div className={styles.panels}>
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
              <h4 className={styles.panelTitle}>Reference distribution</h4>
              {reference ? (
                <>
                  <dl className={styles.figures}>
                    <div
                      onMouseEnter={() => setMeanHover(true)}
                      onMouseLeave={() => setMeanHover(false)}
                    >
                      <dt>COD mean</dt>
                      <dd className={styles.underline}>
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
                      <dd title={rungDescription(record.rung)}>
                        {rungLabel(record.rung)}
                      </dd>
                    </div>
                  </dl>
                  <Histogram
                    className={styles.histogram}
                    bins={histogramBins(record.histogram)}
                    value={record.value}
                    mean={record.mean ?? undefined}
                    meanHovered={meanHover}
                    status={status as HistogramStatus}
                    unit={cfg.unit.trim()}
                    format={cfg.format}
                    axisLabel={cfg.axisLabel}
                    // label={`${geometryLabel(record)} vs. ${record.N} COD observations`}
                  />
                </>
              ) : (
                <p className={styles.noReference}>
                  No reference distribution — matched by{' '}
                  {rungLabel(record.rung)} only, so this geometry can’t be
                  scored.
                </p>
              )}
            </section>
          </div>

          {reference &&
            (obs.length > 0 ? (
              <div className={styles.obsSection}>
                <button
                  type="button"
                  className={styles.obsToggle}
                  aria-expanded={obsOpen}
                  onClick={() => setObsOpen((o) => !o)}
                >
                  {record.N.toLocaleString()} COD observations
                  <span
                    className={`${styles.chevron} ${
                      obsOpen ? styles.chevronOpen : ''
                    }`}
                  >
                    ›
                  </span>
                </button>
                {obsOpen && (
                  <ObservationList
                    obs={obs}
                    total={record.N}
                    unit={cfg.unit}
                    format={cfg.format}
                  />
                )}
              </div>
            ) : (
              <div className={styles.obsSection}>
                <span className={styles.panelMeta}>
                  {record.N.toLocaleString()} COD observations
                </span>
              </div>
            ))}
        </div>
      )}
    </motion.li>
  )
}
