import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
  /** Optional reference-population mean, drawn as a neutral guide line. */
  mean?: number
  /**
   * External hint to reveal the mean guide — e.g. while a "COD mean" figure
   * above the chart is hovered.
   */
  meanHovered?: boolean
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
  /** Caption drawn centered under the x-axis ticks, e.g. "Bond length (Å)". */
  axisLabel?: string
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
  const [hoverBin, setHoverBin] = useState<number | null>(null)
  const meanShown = props.meanHovered === true

  const layout = useMemo(() => {
    const width = props.width ?? DEFAULT_W
    const height = props.height ?? DEFAULT_H
    // Reserve an extra row of space below the ticks for the axis caption.
    const marginBottom = props.axisLabel ? M.bottom + 16 : M.bottom

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
      .range([height - marginBottom, M.top])

    const markerX = props.value === undefined ? null : x(props.value)
    const meanX = props.mean === undefined ? null : x(props.mean)
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
      baseline: height - marginBottom,
      right: width - M.right,
      midX: (M.left + (width - M.right)) / 2,
      tickY: height - marginBottom + 16,
      gap: boxes.length > 40 ? 0.5 : 1.5,
      markerX,
      meanX,
      // Keep the μ label clear of the value marker: sit it on whichever side of
      // the mean line the value marker isn't (default left when there's none).
      meanLabelLeft: markerX === null || markerX >= (meanX ?? -Infinity),
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
    props.mean,
    props.domain,
    props.width,
    props.height,
    props.axisLabel,
  ])

  const format = props.format ?? defaultFormat

  // Accessible name for the chart. Carried on the <svg> via `aria-label` rather
  // than a <title> child, since a <title> renders a native browser tooltip that
  // would fight the per-bin hover tooltip below.
  const summary =
    props.label ??
    `Distribution of ${layout.n} values` +
      (props.value !== undefined
        ? `; marker at ${format(props.value)}${props.unit ?? ''}`
        : '')

  // Tooltip shown while a bar is hovered: how many observations fall in that bin.
  const tip = (() => {
    if (hoverBin === null) return null
    const b = layout.boxes[hoverBin]
    if (!b) return null
    const label = `${b.count.toLocaleString()} obs`
    const w = Math.max(38, label.length * 6 + 14)
    const cx = Math.min(
      Math.max((layout.x(b.x0) + layout.x(b.x1)) / 2, M.left + w / 2),
      layout.right - w / 2,
    )
    const barTop = layout.y(b.count)
    // Prefer sitting above the bar; drop below the bar's top if it would clip.
    const y = barTop - 10 >= M.top + 12 ? barTop - 10 : barTop + 12
    return { cx, y, w, label }
  })()

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={`${styles.svg} ${props.className ?? ''}`}
      role="img"
      aria-label={summary}
      preserveAspectRatio="xMidYMid meet"
    >
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
            style={{ transformBox: 'fill-box', originY: 1, cursor: 'pointer' }}
            onMouseEnter={() => setHoverBin(i)}
            onMouseLeave={() => setHoverBin((h) => (h === i ? null : h))}
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
        <text key={t} x={layout.x(t)} y={layout.tickY} className={styles.tick}>
          {format(t)}
        </text>
      ))}

      {props.axisLabel && (
        <text
          x={layout.midX}
          y={layout.height - 4}
          className={styles.axisLabel}
        >
          {props.axisLabel}
        </text>
      )}
      {layout.meanX !== null && (
        <g>
          <AnimatePresence>
            {meanShown && (
              <motion.g
                key="mean-guide"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ pointerEvents: 'none' }}
              >
                <motion.line
                  x1={layout.meanX}
                  x2={layout.meanX}
                  y1={M.top}
                  y2={layout.baseline}
                  className={styles.meanLine}
                  style={{ transformBox: 'fill-box', originY: 1 }}
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.text
                  x={layout.meanX + (layout.meanLabelLeft ? -3 : 3)}
                  y={M.top + 1}
                  className={styles.meanLabel}
                  style={{ textAnchor: layout.meanLabelLeft ? 'end' : 'start' }}
                  initial={reduce ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: reduce ? 0 : 0.15,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  μ
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>
        </g>
      )}

      {layout.markerX !== null && (
        <g className={statusClass[props.status ?? 'ok']}>
          <motion.line
            x1={layout.markerX}
            x2={layout.markerX}
            y1={M.top - 6}
            y2={layout.baseline}
            className={styles.marker}
            style={{ transformBox: 'fill-box', originY: 1 }}
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              duration: 0.45,
              delay: reduce ? 0 : 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
          <g transform={`translate(${layout.chipX}, ${M.top - 9})`}>
            <motion.g
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: reduce ? 0 : 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
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
            </motion.g>
          </g>
        </g>
      )}

      <AnimatePresence>
        {tip && (
          <motion.g
            key={hoverBin}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ pointerEvents: 'none' }}
          >
            <g transform={`translate(${tip.cx}, ${tip.y})`}>
              <rect
                x={-tip.w / 2}
                y={-9}
                width={tip.w}
                height={18}
                rx={5}
                className={styles.binTip}
              />
              <text className={styles.binTipLabel}>{tip.label}</text>
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}
