import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Histogram, type HistogramStatus } from '@/components/Histogram'
import { floatIn, staggerContainer } from '@/lib/motion'
import {
  byAbsoluteDeviation,
  byOutlierSeverity,
  cleanDepictionSvg,
  codEntryUrl,
  RUNG_ORDER,
  geometryLabel,
  hasReference,
  histogramBins,
  outlierStatus,
  recordElements,
  reportDepiction,
  reportElements,
  rungDescription,
  rungLabel,
  statusLabel,
} from '@/lib/cod'
import type {
  AngleRecord,
  AnalyseResponse,
  BondRecord,
  Observation,
} from '@/types/cod'
import styles from './ValidationReport.module.css'

interface ValidationReportProps {
  report: AnalyseResponse
}

type Kind = 'bonds' | 'angles'

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

/** Cap on observation rows rendered at once; the full count is still shown. */
const OBS_RENDER_CAP = 300

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

  const chipsRef = useRef<HTMLDivElement>(null)
  const [chipFade, setChipFade] = useState({ left: false, right: false })

  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const update = () => {
      setChipFade({
        left: el.scrollLeft > 1,
        right: Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [elements])

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

      <div className={styles.controls}>
        {elements.length > 1 && (
          <div className={styles.elementFilter}>
            <span className={styles.filterLabel}>Elements</span>
            <div
              ref={chipsRef}
              className={`${styles.filterChips} ${
                chipFade.left ? styles.fadeLeft : ''
              } ${chipFade.right ? styles.fadeRight : ''}`}
              role="group"
              aria-label="Filter by element"
            >
              {elements.map((el) => {
                const active = elementFilter.has(el)
                return (
                  <button
                    key={el}
                    type="button"
                    aria-pressed={active}
                    className={`${styles.filterChip} ${
                      active ? styles.filterChipActive : ''
                    }`}
                    onClick={() => toggleElement(el)}
                  >
                    {el}
                  </button>
                )
              })}
            </div>
            {elementFilter.size > 0 && (
              <button
                type="button"
                className={styles.filterClear}
                onClick={() => setElementFilter(new Set())}
              >
                Clear
              </button>
            )}
          </div>
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
          {RUNG_ORDER.map((rung) => {
            const group = records.filter((r) => r.rung === rung)
            if (group.length === 0) return null
            return (
              <section key={rung} className={styles.group}>
                <header className={styles.groupHead}>
                  <span className={styles.groupTitle}>{rungLabel[rung]}</span>
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

interface GeometryRowProps {
  record: BondRecord | AngleRecord
  kind: Kind
  defaultOpen: boolean
}

function GeometryRow(props: GeometryRowProps) {
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
                      <dd title={rungDescription[record.rung]}>
                        {rungLabel[record.rung]}
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
                  {rungLabel[record.rung]} only, so this geometry can’t be
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

interface ObservationListProps {
  obs: Observation[]
  /** True population size (`N`); `obs` may be a server-capped sample of it. */
  total: number
  unit: string
  format: (n: number) => string
}

type ObsColumn = 'cod_id' | 'atoms' | 'value'

const OBS_COLUMNS: { key: ObsColumn; label: string }[] = [
  { key: 'cod_id', label: 'COD entry' },
  { key: 'atoms', label: 'Atoms' },
  { key: 'value', label: 'Value' },
]

/** Atom label for an observation — also the sort key for the Atoms column. */
function observationAtoms(o: Observation): string {
  return o.centre
    ? `${o.atom_1}–${o.centre}–${o.atom_2}`
    : `${o.atom_1}–${o.atom_2}`
}

/** The individual COD entries behind a record's reference distribution. */
function ObservationList(props: ObservationListProps) {
  const [sort, setSort] = useState<{ col: ObsColumn; dir: 'asc' | 'desc' }>({
    col: 'value',
    dir: 'asc',
  })

  const shown = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1
    const rows = [...props.obs].sort((a, b) => {
      if (sort.col === 'cod_id') return (a.cod_id - b.cod_id) * factor
      if (sort.col === 'value') return (a.value - b.value) * factor
      return observationAtoms(a).localeCompare(observationAtoms(b)) * factor
    })
    return rows.slice(0, OBS_RENDER_CAP)
  }, [props.obs, sort])

  function toggleSort(col: ObsColumn) {
    setSort((s) =>
      s.col === col
        ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    )
  }

  return (
    <div className={styles.obsPanel}>
      <div className={styles.obsBox}>
        <div className={styles.obsHead}>
          {OBS_COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={styles.obsSort}
              aria-pressed={sort.col === c.key}
              onClick={() => toggleSort(c.key)}
            >
              {c.label}
              <span className={styles.obsSortArrow} aria-hidden>
                {sort.col === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </span>
            </button>
          ))}
        </div>
        <ol className={styles.obsList}>
          {shown.map((o, i) => (
            <li key={`${o.cod_id}-${i}`} className={styles.obsItem}>
              <a
                className={styles.obsCode}
                href={codEntryUrl(o.cod_id)}
                target="_blank"
                rel="noreferrer"
              >
                {o.cod_id}
              </a>
              <span className={styles.obsAtoms}>{observationAtoms(o)}</span>
              <span className={styles.obsValue}>
                {props.format(o.value)}
                {props.unit}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {shown.length < props.total && (
        <p className={styles.obsNote}>
          Showing {shown.length.toLocaleString()} of{' '}
          {props.total.toLocaleString()} COD observations.
        </p>
      )}
    </div>
  )
}
