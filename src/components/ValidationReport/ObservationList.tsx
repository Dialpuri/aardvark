import { useMemo, useState } from 'react'
import { codEntryUrl } from '@/lib/cod'
import type { Observation } from '@/types/cod'
import styles from './ValidationReport.module.css'

/** Cap on observation rows rendered at once; the full count is still shown. */
const OBS_RENDER_CAP = 300

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
export function ObservationList(props: ObservationListProps) {
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
