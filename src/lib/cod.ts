import type { HistogramBin, HistogramStatus } from '@/components/Histogram'
import type {
  AnalyseResponse,
  AngleRecord,
  BondRecord,
  CodHistogram,
  Rung,
  RungToken,
} from '@/types/cod'

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

/** Match specificity of each known rung token, best (0) → worst. */
const RUNG_TOKEN_RANK: Record<RungToken, number> = {
  full: 0,
  main: 1,
  main_type: 1,
  nb1nb2: 2,
  nb2: 3,
  inring: 4,
  hybrid: 5,
  element: 6,
}

/** Human-readable name for each known rung token. */
const RUNG_TOKEN_LABEL: Record<RungToken, string> = {
  full: 'exact match',
  main: 'main-type match',
  main_type: 'main-type match',
  nb1nb2: 'neighbour match',
  nb2: 'second-neighbour match',
  inring: 'ring match',
  hybrid: 'hybrid match',
  element: 'element only',
}

/** Longer explanation of how specific each known rung token's match was. */
const RUNG_TOKEN_DESCRIPTION: Record<RungToken, string> = {
  full: 'Reference drawn from atoms with identical acedrg types.',
  main: 'Reference drawn from atoms matching on their main type.',
  main_type: 'Reference drawn from atoms matching on their main type.',
  nb1nb2: 'Reference matched on first- and second-neighbour environment.',
  nb2: 'Reference matched on second-neighbour environment.',
  inring: 'Reference matched on ring membership.',
  hybrid: 'Reference matched on a hybrid of type and neighbours.',
  element: 'No specific type match — reference is by element only.',
}

/** Split a (possibly compound) rung into trimmed tokens, e.g. `'main / nb1nb2'`. */
function rungTokens(rung: Rung): string[] {
  return rung
    .split('/')
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Readable form of an unrecognised token, e.g. `'main_type'` → `'main type'`. */
function humaniseToken(token: string): string {
  return token.replace(/_/g, ' ')
}

/**
 * Human-readable name for a rung. Handles v5 per-atom compounds (`'main /
 * nb1nb2'`) by labelling each token, and shows unknown tokens verbatim
 * (humanised) rather than dropping them — so the "Match" field is never blank.
 */
export function rungLabel(rung: Rung): string {
  const tokens = rungTokens(rung)
  if (tokens.length === 0) return humaniseToken(rung) || 'unknown'
  return tokens
    .map((t) => RUNG_TOKEN_LABEL[t as RungToken] ?? humaniseToken(t))
    .join(' / ')
}

/** Tooltip explanation for how specific a rung's reference match was. */
export function rungDescription(rung: Rung): string {
  const tokens = rungTokens(rung)
  if (tokens.length === 1) {
    const desc = RUNG_TOKEN_DESCRIPTION[tokens[0] as RungToken]
    if (desc) return desc
  }
  return `Reference matched per atom: ${rungLabel(rung)}.`
}

/**
 * Specificity rank for a (possibly compound) rung — smaller is a better match.
 * A record is only as good as its weakest-matched atom, so a compound ranks by
 * its least-specific token; unknown tokens sort last.
 */
export function rungRank(rung: Rung): number {
  const tokens = rungTokens(rung)
  if (tokens.length === 0) return Number.MAX_SAFE_INTEGER
  return Math.max(
    ...tokens.map(
      (t) => RUNG_TOKEN_RANK[t as RungToken] ?? Number.MAX_SAFE_INTEGER,
    ),
  )
}

/** Distinct rungs present in the records, ordered best → worst for grouping. */
export function orderedRungs(records: { rung: Rung }[]): Rung[] {
  const seen = Array.from(new Set(records.map((r) => r.rung)))
  return seen.sort((a, b) => rungRank(a) - rungRank(b) || a.localeCompare(b))
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

/**
 * The ligand code for a report, regardless of format version: v5 keeps it in
 * `metadata.comp_id`, v1 in the top-level `comp_id`. Returns `undefined` when
 * neither is present (callers typically fall back to `'ligand'`).
 */
export function reportCompId(
  report: Pick<AnalyseResponse, 'comp_id' | 'metadata'>,
): string | undefined {
  return report.metadata?.comp_id ?? report.comp_id
}

/**
 * The molecule depiction for a report — the same molecule for every row.
 * Prefers the v5 `metadata.original_svg` (a clean, unhighlighted full-molecule
 * drawing); falls back to the first per-record `svg` (highlighted) for v1
 * reports that carry no metadata.
 */
export function reportDepiction(
  report: Pick<AnalyseResponse, 'metadata'> & {
    bonds: BondRecord[]
    angles: AngleRecord[]
  },
): string | null {
  if (report.metadata?.original_svg) return report.metadata.original_svg
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
