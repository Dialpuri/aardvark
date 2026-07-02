import initRDKitModule from '@rdkit/rdkit/dist/RDKit_minimal.js'
import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url'
import type { RDKitModule } from '@rdkit/rdkit'

// Loading the wasm module is expensive, so do it at most once and share the
// resulting promise across all callers.
let rdkitPromise: Promise<RDKitModule> | null = null

/**
 * Load (or return the already-loading) RDKit WebAssembly module.
 *
 * `locateFile` points Emscripten at the wasm asset Vite emits, which works in
 * both dev and production builds.
 */
export function getRDKit(): Promise<RDKitModule> {
  rdkitPromise ??= initRDKitModule({ locateFile: () => wasmUrl })
  return rdkitPromise
}

export interface SvgOptions {
  /** SVG width in pixels. Defaults to 300. */
  width?: number
  /** SVG height in pixels. Defaults to 200. */
  height?: number
  /**
   * Extra RDKit drawing options merged into the details JSON, e.g.
   * `{ atoms: [0, 1], bonds: [0], legend: 'caffeine' }`.
   * See https://www.rdkitjs.com/#drawing-molecules-all-options
   */
  details?: Record<string, unknown>
}

/**
 * Render a SMILES string to an SVG string.
 *
 * Returns `null` when the SMILES can't be parsed, so callers can show a
 * validation message instead of a broken image.
 */
export async function smilesToSvg(
  smiles: string,
  options: SvgOptions = {},
): Promise<string | null> {
  const rdkit = await getRDKit()
  const mol = rdkit.get_mol(smiles)
  if (!mol) return null

  // The mol holds memory on the wasm heap; always free it.
  try {
    const { width = 300, height = 200, details } = options
    if (details) {
      return mol.get_svg_with_highlights(
        JSON.stringify({ width, height, ...details }),
      )
    }
    return mol.get_svg(width, height)
  } finally {
    mol.delete()
  }
}

/** An RGB colour expressed as three floats in the range [0, 1]. */
export type RgbColor = [number, number, number]

export interface HighlightQuery {
  /**
   * SMARTS pattern. Every bond contained in a match is highlighted in `color`.
   *
   * Prefer atomic-number primitives (`[#6]`, `[#8]`) over bare element symbols:
   * RDKit reads bare `C`/`O` as *aliphatic* SMARTS, which silently miss
   * aromatic or substituted atoms. Use recursive SMARTS (`$(...)`) to add
   * chemical context to an atom without dragging extra bonds into the match.
   */
  smarts: string
  /** Highlight colour as RGB floats in [0, 1]. */
  color: RgbColor
}

interface SubstructMatch {
  atoms: number[]
  bonds: number[]
}

/** `get_substruct_matches` returns `{}` (not `[]`) when nothing matches. */
function parseMatches(raw: string): SubstructMatch[] {
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  return Array.isArray(parsed) ? (parsed as SubstructMatch[]) : []
}

/**
 * Render a SMILES string to an SVG with bonds highlighted by chemical pattern.
 *
 * Each {@link HighlightQuery} is resolved against *this* molecule via
 * substructure matching, so the same query list works for any SMILES — a
 * molecule that doesn't contain a pattern simply gets no highlight for it.
 * Later queries win where matches overlap.
 *
 * Returns `null` when the SMILES can't be parsed.
 */
export async function smilesToSvgWithHighlights(
  smiles: string,
  queries: HighlightQuery[],
  options: SvgOptions = {},
): Promise<string | null> {
  const rdkit = await getRDKit()
  const mol = rdkit.get_mol(smiles)
  if (!mol) return null

  try {
    // The molecule's bond → atom map, used to also tint each bond's endpoints.
    const molJson = JSON.parse(mol.get_json()) as {
      molecules: { bonds: { atoms: [number, number] }[] }[]
    }
    const bondAtoms = molJson.molecules[0].bonds

    const bondColor = new Map<number, RgbColor>()
    for (const query of queries) {
      const q = rdkit.get_qmol(query.smarts)
      if (!q) continue
      try {
        for (const match of parseMatches(mol.get_substruct_matches(q))) {
          for (const bond of match.bonds) bondColor.set(bond, query.color)
        }
      } finally {
        q.delete()
      }
    }

    const highlightBondColors: Record<number, RgbColor> = {}
    const highlightAtomColors: Record<number, RgbColor> = {}
    const atoms: number[] = []
    for (const [bond, color] of bondColor) {
      highlightBondColors[bond] = color
      for (const atom of bondAtoms[bond].atoms) {
        atoms.push(atom)
        highlightAtomColors[atom] = color
      }
    }

    return mol.get_svg_with_highlights(
      JSON.stringify({
        width: options.width ?? 300,
        height: options.height ?? 200,
        bonds: [...bondColor.keys()],
        atoms,
        highlightBondColors,
        highlightAtomColors,
        ...options.details,
      }),
    )
  } finally {
    mol.delete()
  }
}
