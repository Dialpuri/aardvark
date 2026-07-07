import type { AnalyseResponse } from '@/types/cod'

/** Input formats the geometry server accepts. It types/parses each itself. */
export type InputFormat = 'smiles' | 'cif' | 'mol' | 'pdb'

/**
 * Request body for the geometry server's `POST /analyse`: the raw structure
 * text plus a tag telling the server how to read it, and an optional ligand
 * code. See `data/sample-server-output/` for the response shape.
 */
export interface AnalyseRequest {
  format: InputFormat
  /** SMILES string, or the full text of a CIF / MOL / PDB file. */
  data: string
  comp_id?: string
}

/**
 * Where analyse requests are sent. Overridable at build time with
 * `VITE_ANALYSE_URL`; defaults to the dev dummy server (see `vite/mockAnalyse`).
 */
export const ANALYSE_URL: string =
  import.meta.env.VITE_ANALYSE_URL ?? '/api/analyse'

// https://quicillith.pl/run_aardvark

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
export function wrapInput(format: InputFormat, data: string): AnalyseRequest {
  return { format, data }
}

/** POST a structure to the geometry server and return the parsed analysis. */
export async function analyse(input: AnalyseRequest): Promise<AnalyseResponse> {
  console.log(input)
  const res = await fetch(ANALYSE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Analyse request failed (${res.status})`)
  return res.json()
}
