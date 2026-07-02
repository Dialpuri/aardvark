import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { FeatureCard } from '@/components/FeatureCard'
import { Footer } from '@/components/Footer'
import { MoleculeSvg } from '@/components/MoleculeSvg'
import type { HighlightQuery, RgbColor } from '@/lib/rdkit'
import { SquareGlyph, BarsGlyph, CircleGlyph } from '@/components/icons'
import { chipIn, floatIn, staggerContainer } from '@/lib/motion'
import styles from './LandingPage.module.css'

const CAFFEINE_SMILES = 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C'

// Pale clinical tints matching the status colours used across the UI.
const STATUS_TINT: Record<'ok' | 'warn' | 'bad', RgbColor> = {
  ok: [0.61, 0.82, 0.73],
  warn: [0.91, 0.81, 0.59],
  bad: [0.91, 0.67, 0.62],
}

// Bonds are selected by chemical pattern, so this generalises to any molecule:
// a urea carbonyl reads "normal", an amide carbonyl "borderline", and a
// ring-fusion double bond "outlier". For caffeine these resolve to C2=O2,
// C6=O6 and C4=C5 respectively — the three bonds called out by the chips.
const CAFFEINE_HIGHLIGHTS: HighlightQuery[] = [
  { smarts: '[#8]=[#6;$([#6]([#7])[#7])]', color: STATUS_TINT.ok },
  { smarts: '[#8]=[#6;$([#6]([#7])[#6])]', color: STATUS_TINT.warn },
  { smarts: '[cR2][cR2]', color: STATUS_TINT.bad },
]

const features = [
  {
    icon: <SquareGlyph />,
    title: 'Paste SMILES or drop a file',
    body: 'Accepts SMILES strings and MOL, SDF or PDB files. No account, no upload limits, nothing to install.',
  },
  {
    icon: <BarsGlyph />,
    title: 'Every bond & angle, scored',
    body: 'Each measurement is compared against the distribution of values observed in thousands of validated structures.',
  },
  {
    icon: <CircleGlyph />,
    title: 'See exactly where it strains',
    body: 'Outliers are highlighted right on the structure, with a histogram showing where your value sits in the distribution.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Give us a structure',
    body: 'Paste a SMILES string or drop a coordinate file. We build the geometry and identify every bond and angle.',
  },
  {
    n: '02',
    title: 'Compare to reference',
    body: 'Each value is matched against the distribution of equivalent measurements across known structures.',
  },
  {
    n: '03',
    title: 'Read the report',
    body: 'Outliers light up on the structure and on a histogram, so you know exactly what to inspect and why.',
  },
]

const chips = [
  { className: styles.chipA, dot: '#1f8a61', label: 'C2=O2 · 1.223 Å' },
  { className: styles.chipB, dot: '#bd7d22', label: 'C6=O6 · borderline' },
  { className: styles.chipC, dot: '#bf3b2b', label: 'C4=C5 · outlier' },
]

export default function LandingPage() {
  return (
    <div>
      <Navbar>
        <span className={styles.navLink}>How it works</span>
        <span className={styles.navLink}>Reference data</span>
        <span className={styles.navLink}>About</span>
        <Button to="/validate" size="md">
          Validate a structure
        </Button>
      </Navbar>

      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroCopy}
          variants={floatIn}
          initial="hidden"
          animate="visible"
        >
          <Badge dot="#1f8f5f">Free · No login · Runs in your browser</Badge>
          <h1 className={styles.title}>
            Is your geometry
            <br />
            actually plausible?
          </h1>
          <p className={styles.lede}>
            Geometra checks every bond length and angle in your structure
            against the distributions seen across thousands of known molecules —
            so you can trust the geometry before it costs you.
          </p>
          <div className={styles.heroActions}>
            <Button to="/validate" size="lg">
              Validate a structure →
            </Button>
            <Button to="/validate" size="lg" variant="secondary">
              See a sample report
            </Button>
          </div>
        </motion.div>

        <motion.div
          className={styles.heroVisual}
          variants={floatIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
        >
          <Card elevated>
            <div className={styles.cardHead}>
              <span className={styles.formula}>caffeine · C₈H₁₀N₄O₂</span>
              <span className={styles.scorePill}>29 / 32 normal</span>
            </div>
            <div className={styles.molecule}>
              <MoleculeSvg
                smiles={CAFFEINE_SMILES}
                width={320}
                height={240}
                highlights={CAFFEINE_HIGHLIGHTS}
                label="Caffeine skeletal structure with highlighted bonds"
              />
            </div>
          </Card>

          <motion.div
            className={styles.chips}
            variants={staggerContainer(0.15, 0.35)}
            initial="hidden"
            animate="visible"
          >
            {chips.map((chip) => (
              <motion.div
                key={chip.label}
                className={`${styles.chip} ${chip.className}`}
                variants={chipIn}
              >
                <span
                  className={styles.chipDot}
                  style={{ background: chip.dot }}
                />
                {chip.label}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <motion.section
        className={styles.features}
        variants={staggerContainer()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {features.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title}>
            {f.body}
          </FeatureCard>
        ))}
      </motion.section>

      {/* How it works */}
      <section className={styles.how}>
        <div className={styles.howHead}>
          <h2>How it works</h2>
          <span className={styles.howSub}>three steps, a few seconds</span>
        </div>
        <div className={styles.steps}>
          {steps.map((s) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h4 className={styles.stepTitle}>{s.title}</h4>
              <p className={styles.stepBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
