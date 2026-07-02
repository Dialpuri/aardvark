import type { HistogramBin, HistogramStatus } from '@/components/Histogram'
import type { AngleRecord, BondRecord, CodHistogram, Rung } from '@/types/cod'

/**
 * Outlier status for a geometry record, driven by `n_sigma` (how many SDs the
 * measured value sits from the COD reference population).
 *
 * `none` means the record carried no reference distribution (an `element`-rung
 * backstop, typically an X–H bond), so there is nothing to score against.
 */
export type GeometryStatus = HistogramStatus | 'none'

/** |n_sigma| below this is unremarkable. */
const WARN_SIGMA = 2
/** |n_sigma| at or above this is a clear outlier. */
const BAD_SIGMA = 3

export function outlierStatus(nSigma: number | null): GeometryStatus {
  if (nSigma === null) return 'none'
  const mag = Math.abs(nSigma)
  if (mag >= BAD_SIGMA) return 'bad'
  if (mag >= WARN_SIGMA) return 'warn'
  return 'ok'
}

export const statusLabel: Record<GeometryStatus, string> = {
  ok: 'normal',
  warn: 'borderline',
  bad: 'outlier',
  none: 'no reference',
}

/** Human-readable name for each fallback rung, best → worst. */
export const rungLabel: Record<Rung, string> = {
  full: 'exact match',
  main: 'main-chain match',
  nb1nb2: 'neighbour match',
  hybrid: 'hybrid match',
  element: 'element only',
}

/** Longer explanation of how specific a rung's reference match was. */
export const rungDescription: Record<Rung, string> = {
  full: 'Reference drawn from atoms with identical acedrg types.',
  main: 'Reference drawn from atoms matching on their main type.',
  nb1nb2: 'Reference matched on first- and second-neighbour environment.',
  hybrid: 'Reference matched on a hybrid of type and neighbours.',
  element: 'No specific type match — reference is by element only.',
}

/**
 * Prepare a server-rendered depiction SVG for inline injection:
 * - drop the XML prolog the HTML parser can't ingest,
 * - drop RDKit's opaque white full-canvas background rect so it sits flush,
 * - drop the fixed pixel width/height so it scales to its container (the
 *   viewBox is preserved, so aspect ratio is kept).
 */
export function cleanDepictionSvg(svg: string): string {
  return svg
    .replace(/^\s*<\?xml[^>]*\?>\s*/, '')
    .replace(/<rect[^>]*fill:#FFFFFF[^>]*>\s*<\/rect>/i, '')
    .replace(/(<svg\b[^>]*?)\swidth='[^']*'\sheight='[^']*'/, '$1')
}

/** First available depiction in the report — the same molecule for every row. */
export function reportDepiction(report: {
  bonds: BondRecord[]
  angles: AngleRecord[]
}): string | null {
  const record = [...report.bonds, ...report.angles].find((r) => r.svg)
  return record?.svg ?? null
}

/**
 * Convert the server's `{ counts, edges }` histogram into the `HistogramBin[]`
 * shape the {@link Histogram} component consumes. Returns `[]` for an empty
 * histogram (rungs with no reference observations).
 */
export function histogramBins(h: CodHistogram): HistogramBin[] {
  const { counts, edges } = h
  if (counts.length === 0 || edges.length < 2) return []
  return counts.map((count, i) => ({ x0: edges[i], x1: edges[i + 1], count }))
}

/** Whether a record carries a usable reference distribution. */
export function hasReference(record: BondRecord | AngleRecord): boolean {
  return record.n_sigma !== null && record.histogram.counts.length > 0
}

/** `"C2–O2"` for a bond, `"C2–C1–C6"` for an angle (vertex in the middle). */
export function geometryLabel(record: BondRecord | AngleRecord): string {
  return 'atom_3' in record
    ? `${record.atom_1}–${record.atom_2}–${record.atom_3}`
    : `${record.atom_1}–${record.atom_2}`
}

/**
 * Sort records worst-first: largest |n_sigma| leads, records with no reference
 * (unscorable X–H geometry) sink to the bottom.
 */
export function byOutlierSeverity(
  a: BondRecord | AngleRecord,
  b: BondRecord | AngleRecord,
): number {
  const av = a.n_sigma === null ? -Infinity : Math.abs(a.n_sigma)
  const bv = b.n_sigma === null ? -Infinity : Math.abs(b.n_sigma)
  return bv - av
}
