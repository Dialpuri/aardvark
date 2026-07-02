/**
 * Types for the COD geometry server response (`POST /analyze/cif` and
 * `POST /analyze`). Both endpoints return this identical shape.
 *
 * See `data/sample-server-output/README.md` for the authoritative field notes.
 */

/**
 * Which fallback rung the reference stats were drawn from, best → worst.
 * A coarse rung (e.g. `element`) means few exact-type matches existed, so the
 * reference distribution is broader — worth surfacing to the user.
 */
export type Rung = 'full' | 'main' | 'nb1nb2' | 'hybrid' | 'element'

/** Full acedrg 4-level atom type; handy for tooltips but not required. */
export interface AtomType {
  'level-1': string
  'level-2': string
  'level-3': string
  'level-4': string
}

/** Adaptive-bin histogram of the reference population. */
export interface CodHistogram {
  /** `counts[i]` spans `edges[i]` → `edges[i + 1]`. Length = nbins (20–80). */
  counts: number[]
  /** Length = nbins + 1. Empty when the rung had no observations. */
  edges: number[]
}

/** Fields shared by bond and angle records. */
interface GeometryRecord {
  /** Full acedrg types keyed by `atom_1`, `atom_2` (and `atom_3` for angles). */
  types: Record<string, AtomType>
  /** This ligand's measured value — Å for bonds, degrees for angles. */
  value: number
  rung: Rung
  /** Number of COD observations at that rung. `0` on the `element` backstop. */
  N: number
  /** COD reference stats — `null` when the rung had zero observations. */
  mean: number | null
  sd: number | null
  skew: number | null
  /** Raw `value - mean` difference (Å or °). `null` with no reference. */
  delta: number | null
  /**
   * `delta / sd` — how many SDs this value sits from the COD population.
   * This is the number to drive outlier colouring. `null` with no reference.
   */
  n_sigma: number | null
  histogram: CodHistogram
  /** Self-contained depiction with these atoms highlighted; `null` if none. */
  svg: string | null
}

/** One measured bond. `atom_1`/`atom_2` are atom names from the cif. */
export interface BondRecord extends GeometryRecord {
  atom_1: string
  atom_2: string
}

/** One measured angle. `atom_2` is the vertex. */
export interface AngleRecord extends GeometryRecord {
  atom_1: string
  atom_2: string
  atom_3: string
}

export interface AnalyzeResponse {
  format_version: number
  /** Ligand three/five-letter code, when the request supplied one. */
  comp_id?: string
  bonds: BondRecord[]
  angles: AngleRecord[]
}
