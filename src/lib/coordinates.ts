import type { AnalyseResponse } from '@/types/cod'

/** Bundled stand-in coordinates, used until the server returns real ones. */
const MOCK_COORDINATES_URL = `${import.meta.env.BASE_URL}sample/A1C3B.coords.cif`

export interface ReportCoordinates {
  /** Raw coordinate-file text (mmCIF/PDB) for the 3D viewer. */
  text: string
  /** File-name hint whose extension tells gemmi which format to parse. */
  name: string
}

/**
 * Coordinates for the ligand to render in 3D. The analysis server will
 * eventually return these on the report (see {@link AnalyseResponse.coordinates});
 * until then we fall back to a bundled mock so the viewer has something to show.
 */
export async function loadReportCoordinates(
  report: AnalyseResponse,
): Promise<ReportCoordinates> {
  if (report.coordinates) {
    return {
      text: report.coordinates,
      name: `${report.comp_id ?? 'ligand'}.cif`,
    }
  }
  const res = await fetch(MOCK_COORDINATES_URL)
  if (!res.ok) {
    throw new Error(`Couldn't load coordinates (${res.status})`)
  }
  return { text: await res.text(), name: 'A1C3B.coords.cif' }
}
