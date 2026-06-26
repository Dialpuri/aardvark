import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Histogram } from './Histogram'

// A small bell-ish sample of bond lengths.
const data = [
  1.2, 1.21, 1.21, 1.22, 1.22, 1.22, 1.23, 1.23, 1.23, 1.23, 1.24, 1.24, 1.25,
  1.26, 1.19,
]

describe('Histogram', () => {
  it('renders one bar per bin plus the baseline axis', () => {
    const { container } = render(<Histogram data={data} binCount={8} />)
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0)
    expect(container.querySelector('line')).toBeTruthy()
  })

  it('exposes an accessible label and draws a marker for `value`', () => {
    const { getByRole, container } = render(
      <Histogram data={data} value={1.26} status="warn" unit=" Å" />,
    )
    expect(getByRole('img')).toHaveAccessibleName(/distribution of 15 values/i)
    // Marker label shows the formatted value + unit.
    expect(container.textContent).toContain('1.26 Å')
  })

  it('does not crash on empty data', () => {
    const { getByRole } = render(<Histogram data={[]} />)
    expect(getByRole('img')).toBeInTheDocument()
  })

  it('accepts pre-binned input and sums counts for the summary', () => {
    const prebinned = [
      { x0: 1.18, x1: 1.2, count: 4 },
      { x0: 1.2, x1: 1.22, count: 11 },
      { x0: 1.22, x1: 1.24, count: 20 },
      { x0: 1.24, x1: 1.26, count: 7 },
    ]
    const { getByRole, container } = render(
      <Histogram bins={prebinned} value={1.25} status="warn" unit=" Å" />,
    )
    // One <rect> per bin (+1 for the marker chip).
    expect(container.querySelectorAll('rect')).toHaveLength(
      prebinned.length + 1,
    )
    expect(getByRole('img')).toHaveAccessibleName(/distribution of 42 values/i)
  })
})
