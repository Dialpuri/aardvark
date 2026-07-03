import type { AnalyzeResponse } from '@/types/cod'

/** Input formats the geometry server accepts. It types/parses each itself. */
export type InputFormat = 'smiles' | 'cif' | 'mol' | 'pdb'

/**
 * Request body for the geometry server's `POST /analyze`: the raw structure
 * text plus a tag telling the server how to read it, and an optional ligand
 * code. See `data/sample-server-output/` for the response shape.
 */
export interface AnalyzeRequest {
  format: InputFormat
  /** SMILES string, or the full text of a CIF / MOL / PDB file. */
  data: string
  comp_id?: string
}

/**
 * Where analyze requests are sent. Overridable at build time with
 * `VITE_ANALYZE_URL`; defaults to the dev dummy server (see `vite/mockAnalyze`).
 */
export const ANALYZE_URL: string =
  import.meta.env.VITE_ANALYZE_URL ?? '/api/analyze'

/** Map a dropped/selected file's extension to an {@link InputFormat}. */
export function formatFromFilename(name: string): InputFormat | null {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'cif':
      return 'cif'
    case 'mol':
    case 'sdf':
    case 'mol2':
      return 'mol'
    case 'pdb':
    case 'ent':
      return 'pdb'
    default:
      return null
  }
}

/** Build the JSON payload the server expects from raw structure text. */
export function wrapInput(
  format: InputFormat,
  data: string,
  compId?: string,
): AnalyzeRequest {
  const body: AnalyzeRequest = { format, data }
  if (compId) body.comp_id = compId
  return body
}

/** POST a structure to the geometry server and return the parsed analysis. */
export async function analyze(input: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(ANALYZE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Analyze request failed (${res.status})`)
  return res.json()
}
