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

/** Canonical page for a COD entry, e.g. `.../cod/1553293.html`. */
export function codEntryUrl(codId: number): string {
  return `https://www.crystallography.net/cod/${codId}.html`
}

/**
 * Absolute deviation from the COD mean (|delta|, in Å / °) at or above which a
 * record is a clear outlier — separate cutoffs per geometry kind.
 */
const OUTLIER_DELTA = { bond: 0.05, angle: 1.9 }
/** Borderline (amber) starts at 80% of the outlier cutoff. */
const BORDERLINE_FRACTION = 0.8

/**
 * Classify a record by how far its measured value sits from the COD mean, in
 * raw Å (bonds) or ° (angles). `none` when the record carried no reference
 * distribution (an `element`-rung backstop), so there's nothing to score.
 */
export function outlierStatus(
  record: BondRecord | AngleRecord,
): GeometryStatus {
  if (record.delta === null) return 'none'
  const cutoff = 'atom_3' in record ? OUTLIER_DELTA.angle : OUTLIER_DELTA.bond
  const mag = Math.abs(record.delta)
  if (mag >= cutoff) return 'bad'
  if (mag >= cutoff * BORDERLINE_FRACTION) return 'warn'
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
 * Element symbol from a cif atom name, e.g. `"P11" → "P"`, `"BR1" → "Br"`.
 * Cif names lead with the element's letters (any case) then a serial number, so
 * take the leading run of letters and normalise to standard capitalisation.
 */
export function elementOf(atomName: string): string {
  const letters = atomName.match(/^[A-Za-z]+/)?.[0] ?? atomName
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
}

/** The distinct elements a record's atoms are drawn from. */
export function recordElements(record: BondRecord | AngleRecord): string[] {
  const names =
    'atom_3' in record
      ? [record.atom_1, record.atom_2, record.atom_3]
      : [record.atom_1, record.atom_2]
  return [...new Set(names.map(elementOf))]
}

/** Every element present across a report's bonds and angles, sorted. */
export function reportElements(report: {
  bonds: BondRecord[]
  angles: AngleRecord[]
}): string[] {
  const seen = new Set<string>()
  for (const record of [...report.bonds, ...report.angles]) {
    for (const el of recordElements(record)) seen.add(el)
  }
  return [...seen].sort()
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

/**
 * Sort records worst-first by |delta| — the raw Å/° gap from the COD mean,
 * ignoring how tight the reference population is. Records with no reference
 * sink to the bottom. Only meaningful within one kind (bonds OR angles), since
 * the units differ.
 */
export function byAbsoluteDeviation(
  a: BondRecord | AngleRecord,
  b: BondRecord | AngleRecord,
): number {
  const av = a.delta === null ? -Infinity : Math.abs(a.delta)
  const bv = b.delta === null ? -Infinity : Math.abs(b.delta)
  return bv - av
}

/** Rungs best (most specific) → worst; drives the "by rung" grouped view. */
export const RUNG_ORDER: Rung[] = [
  'full',
  'main',
  'nb1nb2',
  'hybrid',
  'element',
]
