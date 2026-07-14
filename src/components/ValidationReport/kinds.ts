/** The two geometry kinds a report is split into. */
export type Kind = 'bonds' | 'angles'

/** Per-kind display config: the unit and how to format a measured value. */
export const KINDS: Record<
  Kind,
  {
    label: string
    unit: string
    axisLabel: string
    format: (n: number) => string
  }
> = {
  bonds: {
    label: 'Bonds',
    unit: ' Å',
    axisLabel: 'Bond length (Å)',
    format: (n) => n.toFixed(3),
  },
  angles: {
    label: 'Angles',
    unit: '°',
    axisLabel: 'Bond angle (°)',
    format: (n) => n.toFixed(1),
  },
}
