import type {
  AnalyseResponse,
  AngleRecord,
  BondRecord,
  DictionaryRestraint,
} from '@/types/cod'

/**
 * Mock stand-in for the restraint dictionary format v6 will return per record.
 * Until the server emits `dict`, we synthesise it from what a report already
 * carries: the idealised `value` is the current target, and `sd` (the COD
 * spread) is a reasonable proxy for its esd, floored so a razor-tight reference
 * doesn't imply an implausibly hard restraint.
 *
 * Delete this module — and the `withMockDictionary` call sites — once real v6
 * reports arrive with `dict` already populated.
 */

/** Minimum restraint esd, per geometry kind — bonds in Å, angles in °. */
const MIN_ESD = { bond: 0.02, angle: 1.5 }

function mockRestraint(
  record: BondRecord | AngleRecord,
  kind: 'bond' | 'angle',
): DictionaryRestraint {
  const esd =
    record.sd === null ? MIN_ESD[kind] : Math.max(record.sd, MIN_ESD[kind])
  return { value: record.value, esd: round(esd, kind) }
}

/** Round an esd to the precision that kind's values are quoted at. */
function round(value: number, kind: 'bond' | 'angle'): number {
  const dp = kind === 'bond' ? 3 : 2
  return Number(value.toFixed(dp))
}

/**
 * Return a copy of `report` with a `dict` restraint filled in on every bond and
 * angle that doesn't already have one, so the remediation editor has a target
 * to work from. A no-op on records that already carry `dict` (real v6).
 */
export function withMockDictionary(report: AnalyseResponse): AnalyseResponse {
  return {
    ...report,
    bonds: report.bonds.map((b) =>
      b.dict ? b : { ...b, dict: mockRestraint(b, 'bond') },
    ),
    angles: report.angles.map((a) =>
      a.dict ? a : { ...a, dict: mockRestraint(a, 'angle') },
    ),
  }
}
