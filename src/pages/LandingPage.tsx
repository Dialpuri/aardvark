import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { chipIn, floatIn, staggerContainer } from '@/lib/motion'
import caffeineHeroSvg from '@/assets/caffeine-hero.svg?raw'
import styles from './LandingPage.module.css'

const steps = [
  {
    n: '01',
    title: 'Provide a structure',
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
    body: 'Outliers are highlighted on structure and on a histogram, so you know exactly what to inspect and why.',
  },
]

const chips = [
  { className: styles.chipA, dot: '#1f8a61', label: 'C2=O2 · 1.223 Å' },
  { className: styles.chipB, dot: '#bf3b2b', label: 'C4=C5 · outlier' },
  { className: styles.chipC, dot: '#bd7d22', label: 'C6=O6 · borderline' },
]

export default function LandingPage() {
  return (
    <div>
      <Navbar>
        <a href={'#how-it-works'} className={styles.navLink}>
          How it works
        </a>
        <a className={styles.navLink}>Reference data</a>
        <a className={styles.navLink}>About</a>
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
          <Badge dot="#1f8f5f">Free · No login · Locally installable </Badge>
          <h1 className={styles.title}>
            Is your ligand dictionary
            <br />
            actually plausible?
          </h1>
          <p className={styles.lede}>
            AARDVARK checks every bond length and angle in your dictionary
            against the distributions seen across thousands of known molecules
            in the Crystallography Open Density, so you can be confident in your
            structure determination.
          </p>
          <div className={styles.heroActions}>
            <Button to="/validate" size="lg">
              Validate a structure →
            </Button>
            <Button to="/validate?sample" size="lg" variant="secondary">
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
            <div
              className={styles.molecule}
              role="img"
              aria-label="Caffeine skeletal structure with highlighted bonds"
              dangerouslySetInnerHTML={{ __html: caffeineHeroSvg }}
            />
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

      {/* How it works */}
      <section className={styles.how} id="how-it-works">
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
    </div>
  )
}
