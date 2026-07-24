import { describe, expect, it } from 'vitest'
import {
  elementOf,
  orderedRungs,
  recordElements,
  reportElements,
  rungLabel,
  rungRank,
} from './cod'
import type { AngleRecord, BondRecord } from '@/types/cod'

// Only the atom-name fields matter here; the rest of the record is unused by
// the element helpers, so cast a minimal shape.
function bond(atom_1: string, atom_2: string): BondRecord {
  return { atom_1, atom_2 } as BondRecord
}
function angle(atom_1: string, atom_2: string, atom_3: string): AngleRecord {
  return { atom_1, atom_2, atom_3 } as AngleRecord
}

describe('elementOf', () => {
  it('strips the serial number from a cif atom name', () => {
    expect(elementOf('P11')).toBe('P')
    expect(elementOf('O19')).toBe('O')
  })

  it('normalises capitalisation for two-letter elements', () => {
    expect(elementOf('BR1')).toBe('Br')
    expect(elementOf('br1')).toBe('Br')
  })

  it('handles a name with no serial number', () => {
    expect(elementOf('C')).toBe('C')
  })
})

describe('recordElements', () => {
  it('deduplicates elements within a bond', () => {
    expect(recordElements(bond('C01', 'C02'))).toEqual(['C'])
  })

  it('includes the angle vertex atom', () => {
    expect(recordElements(angle('O12', 'P11', 'O13')).sort()).toEqual([
      'O',
      'P',
    ])
  })
})

describe('reportElements', () => {
  it('collects the sorted union across bonds and angles', () => {
    const report = {
      bonds: [bond('P11', 'O12'), bond('C01', 'C02')],
      angles: [angle('O12', 'P11', 'BR1')],
    }
    expect(reportElements(report)).toEqual(['Br', 'C', 'O', 'P'])
  })
})

describe('rungLabel', () => {
  it('labels a known single-token rung', () => {
    expect(rungLabel('full')).toBe('exact match')
    expect(rungLabel('element')).toBe('element only')
  })

  it('labels each token of a v5 per-atom compound', () => {
    expect(rungLabel('main / nb1nb2')).toBe('main-type match / neighbour match')
  })

  it('never returns blank for an unknown token', () => {
    expect(rungLabel('some_new_rung')).toBe('some new rung')
    expect(rungLabel('')).toBe('unknown')
  })
})

describe('rungRank', () => {
  it('ranks more specific matches ahead of coarser ones', () => {
    expect(rungRank('full')).toBeLessThan(rungRank('nb1nb2'))
    expect(rungRank('nb1nb2')).toBeLessThan(rungRank('element'))
  })

  it('ranks a compound by its least-specific token', () => {
    expect(rungRank('full / nb2')).toBe(rungRank('nb2'))
  })
})

describe('orderedRungs', () => {
  it('lists distinct rungs best → worst, keeping unknown values', () => {
    const records = [
      { rung: 'element' },
      { rung: 'full' },
      { rung: 'nb1nb2' },
      { rung: 'full' },
      { rung: 'mystery' },
    ]
    expect(orderedRungs(records)).toEqual([
      'full',
      'nb1nb2',
      'element',
      'mystery',
    ])
  })
})
