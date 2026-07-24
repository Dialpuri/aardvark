/**
 * Regenerate the static hero depiction used on the landing page.
 *
 * Renders the same caffeine SVG the app used to draw at runtime (same SMILES,
 * highlight queries and dimensions as the old <MoleculeSvg> usage) and writes
 * it to src/assets/caffeine-hero.svg.
 *
 * @rdkit/rdkit is no longer a project dependency, so install it temporarily
 * to regenerate:
 *
 *   pnpm add -D @rdkit/rdkit
 *   node scripts/capture-caffeine-svg.mjs
 *   pnpm remove @rdkit/rdkit
 */
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import initRDKitModule from '@rdkit/rdkit/dist/RDKit_minimal.js'

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('@rdkit/rdkit/dist/RDKit_minimal.wasm')

const OUT = new URL('../src/assets/caffeine-hero.svg', import.meta.url)

const SMILES = 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C'
const WIDTH = 320
const HEIGHT = 240

// Keep in sync with CAFFEINE_HIGHLIGHTS / STATUS_TINT in LandingPage.tsx.
const HIGHLIGHTS = [
  { smarts: '[#8]=[#6;$([#6]([#7])[#7])]', color: [0.61, 0.82, 0.73] },
  { smarts: '[#8]=[#6;$([#6]([#7])[#6])]', color: [0.91, 0.81, 0.59] },
  { smarts: '[cR2][cR2]', color: [0.91, 0.67, 0.62] },
]

function parseMatches(raw) {
  if (!raw) return []
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

// Mirrors smilesToSvgWithHighlights in src/lib/rdkit.ts.
const rdkit = await initRDKitModule({ locateFile: () => wasmPath })
const mol = rdkit.get_mol(SMILES)
if (!mol) throw new Error(`RDKit could not parse SMILES: ${SMILES}`)

const molJson = JSON.parse(mol.get_json())
const bondAtoms = molJson.molecules[0].bonds

const bondColor = new Map()
for (const query of HIGHLIGHTS) {
  const q = rdkit.get_qmol(query.smarts)
  if (!q) continue
  for (const match of parseMatches(mol.get_substruct_matches(q))) {
    for (const bond of match.bonds) bondColor.set(bond, query.color)
  }
  q.delete()
}

const highlightBondColors = {}
const highlightAtomColors = {}
const atoms = []
for (const [bond, color] of bondColor) {
  highlightBondColors[bond] = color
  for (const atom of bondAtoms[bond].atoms) {
    atoms.push(atom)
    highlightAtomColors[atom] = color
  }
}

const svg = mol.get_svg_with_highlights(
  JSON.stringify({
    width: WIDTH,
    height: HEIGHT,
    bonds: [...bondColor.keys()],
    atoms,
    highlightBondColors,
    highlightAtomColors,
  }),
)
mol.delete()

await writeFile(OUT, svg)
console.log(
  `wrote ${path.relative(process.cwd(), OUT.pathname)} (${svg.length} bytes)`,
)
