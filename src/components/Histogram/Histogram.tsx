import { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { bin, extent, max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import styles from './Histogram.module.css'

export type HistogramStatus = 'ok' | 'warn' | 'bad'

/** A pre-computed bin. `x1` is exclusive except on the final bin. */
export interface HistogramBin {
  x0: number
  x1: number
  count: number
}

interface CommonProps {
  /** Optional "your value" marker drawn over the distribution. */
  value?: number
  /** Colour of the marker and the bin it falls in. */
  status?: HistogramStatus
  /** Fix the x-domain. Defaults to the span of the bins. */
  domain?: [number, number]
  /** Unit appended to the marker label, e.g. "Å". */
  unit?: string
  /** Formats axis ticks and the marker value. */
  format?: (n: number) => string
  /** Accessible description; also used to derive a default summary. */
  label?: string
  /** viewBox dimensions — the SVG scales responsively to its container. */
  width?: number
  height?: number
  className?: string
}

type HistogramProps = CommonProps &
  (
    | { bins: HistogramBin[]; data?: never; binCount?: never }
    | { data: number[]; binCount?: number; bins?: never }
  )

const M = { top: 18, right: 12, bottom: 22, left: 12 }
const DEFAULT_W = 320
const DEFAULT_H = 160
const defaultFormat = (n: number) => String(Math.round(n * 1000) / 1000)

const statusClass: Record<HistogramStatus, string> = {
  ok: styles.ok,
  warn: styles.warn,
  bad: styles.bad,
}

export function Histogram(props: HistogramProps) {
  const reduce = useReducedMotion()
  const titleId = useId()

  const layout = useMemo(() => {
    const width = props.width ?? DEFAULT_W
    const height = props.height ?? DEFAULT_H

    // Normalise raw observations and pre-binned input to one shape.
    let boxes: HistogramBin[]
    let n: number
    if (props.bins) {
      boxes = props.bins
      n = props.bins.reduce((sum, b) => sum + b.count, 0)
    } else {
      const arr = props.data ?? []
      const [lo = 0, hi = 1] = props.domain ?? extent(arr)
      const [d0, d1] = lo === hi ? [lo - 0.5, hi + 0.5] : [lo, hi]
      boxes = bin()
        .domain([d0, d1])
        .thresholds(props.binCount ?? 24)(arr)
        .map((b) => ({ x0: b.x0!, x1: b.x1!, count: b.length }))
      n = arr.length
    }

    const lo = props.domain?.[0] ?? boxes[0]?.x0 ?? 0
    const hi = props.domain?.[1] ?? boxes.at(-1)?.x1 ?? 1
    const [d0, d1] = lo === hi ? [lo - 0.5, hi + 0.5] : [lo, hi]

    const x = scaleLinear()
      .domain([d0, d1])
      .range([M.left, width - M.right])
    const yMax = max(boxes, (b) => b.count) ?? 1
    const y = scaleLinear()
      .domain([0, yMax])
      .range([height - M.bottom, M.top])

    const markerX = props.value === undefined ? null : x(props.value)
    const markerBin =
      props.value === undefined
        ? -1
        : boxes.findIndex((b, i) =>
            i === boxes.length - 1
              ? props.value! >= b.x0 && props.value! <= b.x1
              : props.value! >= b.x0 && props.value! < b.x1,
          )

    return {
      width,
      height,
      boxes,
      n,
      x,
      y,
      ticks: x.ticks(5),
      baseline: height - M.bottom,
      right: width - M.right,
      gap: boxes.length > 40 ? 0.5 : 1.5,
      markerX,
      markerBin,
      chipX:
        markerX === null
          ? 0
          : Math.min(Math.max(markerX, M.left + 22), width - M.right - 22),
    }
  }, [
    props.bins,
    props.data,
    props.binCount,
    props.value,
    props.domain,
    props.width,
    props.height,
  ])

  const format = props.format ?? defaultFormat
  const summary =
    props.label ??
    `Distribution of ${layout.n} values` +
      (props.value !== undefined
        ? `; marker at ${format(props.value)}${props.unit ?? ''}`
        : '')

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={`${styles.svg} ${props.className ?? ''}`}
      role="img"
      aria-labelledby={titleId}
      preserveAspectRatio="xMidYMid meet"
    >
      <title id={titleId}>{summary}</title>

      {layout.boxes.map((b, i) => {
        const bx = layout.x(b.x0)
        const bw = Math.max(0, layout.x(b.x1) - bx - layout.gap)
        const hit = i === layout.markerBin
        return (
          <motion.rect
            key={i}
            x={bx + layout.gap / 2}
            width={bw}
            y={layout.y(b.count)}
            height={Math.max(0, layout.baseline - layout.y(b.count))}
            rx={2}
            className={`${styles.bar} ${hit ? statusClass[props.status ?? 'ok'] : ''}`}
            style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: 0.5,
              delay: reduce ? 0 : i * 0.012,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )
      })}

      <line
        x1={M.left}
        x2={layout.right}
        y1={layout.baseline}
        y2={layout.baseline}
        className={styles.axis}
      />

      {layout.ticks.map((t) => (
        <text
          key={t}
          x={layout.x(t)}
          y={layout.height - 6}
          className={styles.tick}
        >
          {format(t)}
        </text>
      ))}

      {layout.markerX !== null && (
        <g className={statusClass[props.status ?? 'ok']}>
          <line
            x1={layout.markerX}
            x2={layout.markerX}
            y1={M.top - 6}
            y2={layout.baseline}
            className={styles.marker}
          />
          <g transform={`translate(${layout.chipX}, ${M.top - 9})`}>
            <rect
              x={-22}
              y={-11}
              width={44}
              height={18}
              rx={5}
              className={styles.markerChip}
            />
            <text className={styles.markerLabel}>
              {format(props.value!)}
              {props.unit ?? ''}
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}
