import { Fragment } from 'react'

type BondStatus = 'ok' | 'warn' | 'bad'

interface Atom {
  el: 'C' | 'N' | 'O'
  x: number
  y: number
  label: string
}

interface Bond {
  a: number
  b: number
  double?: boolean
}

// Caffeine skeleton (atom indices match the bond list below).
const ATOMS: Atom[] = [
  { el: 'C', x: 0, y: 0.7, label: '' }, // 0  C4 (fusion)
  { el: 'C', x: 0, y: -0.7, label: '' }, // 1  C5 (fusion)
  { el: 'C', x: -1.2, y: -1.4, label: '' }, // 2  C6
  { el: 'N', x: -2.4, y: -0.7, label: 'N' }, // 3  N1
  { el: 'C', x: -2.4, y: 0.7, label: '' }, // 4  C2
  { el: 'N', x: -1.2, y: 1.4, label: 'N' }, // 5  N3
  { el: 'O', x: -3.6, y: 1.4, label: 'O' }, // 6  O2
  { el: 'O', x: -1.2, y: -2.8, label: 'O' }, // 7  O6
  { el: 'C', x: -3.6, y: -1.4, label: 'H₃C' }, // 8  N1-methyl
  { el: 'C', x: -1.2, y: 2.8, label: 'CH₃' }, // 9  N3-methyl
  { el: 'N', x: 1.25, y: 1.1, label: 'N' }, // 10 N9
  { el: 'C', x: 2.1, y: 0, label: '' }, // 11 C8
  { el: 'N', x: 1.25, y: -1.1, label: 'N' }, // 12 N7
  { el: 'C', x: 2.2, y: -2.25, label: 'CH₃' }, // 13 N7-methyl
]

const BONDS: Bond[] = [
  { a: 3, b: 4 }, // 0
  { a: 4, b: 5 }, // 1
  { a: 4, b: 6, double: true }, // 2  C2=O2
  { a: 5, b: 0 }, // 3
  { a: 0, b: 1, double: true }, // 4  C4=C5
  { a: 1, b: 2 }, // 5
  { a: 2, b: 3 }, // 6
  { a: 2, b: 7, double: true }, // 7  C6=O6
  { a: 0, b: 10 }, // 8
  { a: 10, b: 11, double: true }, // 9
  { a: 11, b: 12 }, // 10
  { a: 12, b: 1 }, // 11
  { a: 3, b: 8 }, // 12
  { a: 5, b: 9 }, // 13
  { a: 12, b: 13 }, // 14
]

const HIGHLIGHT: Record<BondStatus, string> = {
  ok: '#1f8a61',
  warn: '#bd7d22',
  bad: '#bf3b2b',
}

interface MoleculeGlyphProps {
  scale?: number
  /** Map of bond index → status, draws a soft highlight behind the bond. */
  bondStatus?: Record<number, BondStatus>
  className?: string
}

export function MoleculeGlyph({
  scale = 34,
  bondStatus,
  className,
}: MoleculeGlyphProps) {
  const xs = ATOMS.map((a) => a.x)
  const ys = ATOMS.map((a) => a.y)
  const pad = 44
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = (maxX - minX) * scale + pad * 2
  const h = (maxY - minY) * scale + pad * 2
  const px = (a: Atom) => pad + (a.x - minX) * scale
  const py = (a: Atom) => pad + (maxY - a.y) * scale

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={className}
      role="img"
      aria-label="Caffeine skeletal structure"
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
    >
      {BONDS.map((bd, idx) => {
        const A = ATOMS[bd.a]
        const B = ATOMS[bd.b]
        const ax = px(A)
        const ay = py(A)
        const bx = px(B)
        const by = py(B)
        const dx = bx - ax
        const dy = by - ay
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        const tA = A.label ? 13 : 2
        const tB = B.label ? 13 : 2
        const x1 = ax + ux * tA
        const y1 = ay + uy * tA
        const x2 = bx - ux * tB
        const y2 = by - uy * tB
        const status = bondStatus?.[idx]
        // Perpendicular offset for the two strokes of a double bond.
        const ox = -uy * 2.7
        const oy = ux * 2.7

        return (
          <Fragment key={idx}>
            {status && status !== 'ok' && (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={HIGHLIGHT[status]}
                strokeWidth={11}
                strokeLinecap="round"
                opacity={0.22}
              />
            )}
            {bd.double ? (
              <>
                <line
                  x1={x1 + ox}
                  y1={y1 + oy}
                  x2={x2 + ox}
                  y2={y2 + oy}
                  stroke="#16202b"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                />
                <line
                  x1={x1 - ox}
                  y1={y1 - oy}
                  x2={x2 - ox}
                  y2={y2 - oy}
                  stroke="#16202b"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                />
              </>
            ) : (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#2c2c34"
                strokeWidth={1.7}
                strokeLinecap="round"
              />
            )}
          </Fragment>
        )
      })}

      {ATOMS.map((a, idx) => {
        if (!a.label) return null
        const x = px(a)
        const y = py(a)
        const col =
          a.el === 'N' ? '#2b6da3' : a.el === 'O' ? '#bf3b2b' : '#54616e'
        const wide = a.label.length > 1
        return (
          <Fragment key={idx}>
            <rect
              x={x - (wide ? 17 : 10)}
              y={y - 10}
              width={wide ? 34 : 20}
              height={20}
              rx={5}
              fill="#fff"
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fontWeight={600}
              fontFamily="'IBM Plex Sans', sans-serif"
              fill={col}
            >
              {a.label}
            </text>
          </Fragment>
        )
      })}
    </svg>
  )
}
