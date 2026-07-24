/**
 * Types for the COD geometry server response (`POST /analyse/cif` and
 * `POST /analyse`). Both endpoints return this identical shape.
 *
 * See `data/sample-server-output/README.md` for the authoritative field notes.
 */

/**
 * Known atom-match levels, best (most specific) → worst. Format v5 can report a
 * different level per atom, so a record's {@link Rung} may be a single token or
 * a compound like `'main / nb1nb2'` — {@link RungToken} lists the tokens it is
 * built from.
 */
export type RungToken =
  | 'full'
  | 'main'
  | 'main_type'
  | 'nb1nb2'
  | 'nb2'
  | 'inring'
  | 'hybrid'
  | 'element'

/**
 * Which fallback level(s) the reference stats were drawn from. A coarse match
 * (e.g. `element`) means few exact-type matches existed, so the reference
 * distribution is broader — worth surfacing to the user. Free-form because v5
 * reports per-atom compounds (`'nb2 / inring'`); present it with `rungLabel`
 * and order it with `rungRank` rather than comparing against a fixed set.
 */
export type Rung = string

/**
 * Acedrg atom type for one end of a bond/angle; handy for tooltips but not
 * required. Format v5 keys these by descriptive name (`full_type` … `element`);
 * v1 used positional `level-1` … `level-4`. Both are kept optional so a report
 * of either version type-checks — v5 is the current standard.
 */
export interface AtomType {
  /** v5: fully-qualified type (v1 `level-4`). */
  full_type?: string
  /** v5: main type without neighbour braces (v1 `level-3`). */
  main_type?: string
  /** v5: first-/second-neighbour signature (v1 `level-2`). */
  nb1nb2?: string
  /** v5: bare element symbol (v1 `level-1`). */
  element?: string
  /** @deprecated v1 positional types; superseded by the named fields above. */
  'level-1'?: string
  'level-2'?: string
  'level-3'?: string
  'level-4'?: string
}

/**
 * One raw COD observation contributing to a record's reference stats — a single
 * matching bond/angle measured in a real Crystallography Open Database entry.
 */
export interface Observation {
  /** COD entry id; see `codEntryUrl` for the crystallography.net link. */
  cod_id: number
  /** The measured value in that entry — Å for bonds, degrees for angles. */
  value: number
  /** Atom names of the matching bond/angle within the COD entry. */
  atom_1: string
  atom_2: string
  /** Vertex atom name — angle observations only. */
  centre?: string
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
   * Surfaced per row and offered as a sort key; outlier colouring is driven by
   * |delta| against per-kind cutoffs (see `outlierStatus`). `null` with no
   * reference.
   */
  n_sigma: number | null
  histogram: CodHistogram
  /** Self-contained depiction with these atoms highlighted; `null` if none. */
  svg: string | null
  /**
   * The raw contributing observations. Only emitted for non-`element` rungs and
   * capped server-side (`MAX_OBS = 10000`), so `obs.length` can be far below `N`.
   * Absent when the server didn't supply them.
   */
  obs?: Observation[]
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

/** A tool that contributed to producing the report. */
export interface SoftwareInfo {
  name: string
  version: string | null
  description?: string
}

/** Where the analysed ligand sits in its source structure. */
export interface ReportLocation {
  model: number
  chain_id: string
  seqnum: number
  ins_code: string
  resname: string
}

/**
 * Provenance and identity for the report, introduced in format v5. Older (v1)
 * reports carry no `metadata`; the ligand code then lives in the top-level
 * `comp_id`. Prefer {@link reportCompId} to read the code regardless of version.
 */
export interface ReportMetadata {
  /** Ligand three/five-letter code. */
  comp_id?: string
  /** Human-readable chemical name, when known. */
  name?: string | null
  /** How the report was produced, e.g. `'coordinates'` or `'dictionary'`. */
  source?: string
  /** ISO-8601 timestamp the report was generated. */
  date?: string
  acedrg_version?: string | null
  software?: SoftwareInfo[]
  coord_file?: string
  /** Coordinate selection id, e.g. `'//A/303'`. */
  cid?: string
  location?: ReportLocation
  /** `sha256:…` digest of the input. */
  input_hash?: string
  /** Clean full-molecule depiction (no per-record highlight); see `reportDepiction`. */
  original_svg?: string
}

export interface AnalyseResponse {
  format_version: number
  /** Provenance/identity block (format v5+). Absent on legacy v1 reports. */
  metadata?: ReportMetadata
  /**
   * Ligand three/five-letter code — top-level in v1 only. In v5 it moved into
   * {@link ReportMetadata.comp_id}; read it via {@link reportCompId}.
   */
  comp_id?: string
  bonds: BondRecord[]
  angles: AngleRecord[]
  /**
   * Raw coordinate-file text (mmCIF/PDB) for the ligand, fed to the 3D viewer.
   * Not yet emitted by the server — a bundled mock stands in for now, see
   * `loadReportCoordinates` in `@/lib/coordinates`.
   */
  coordinates?: string
}
