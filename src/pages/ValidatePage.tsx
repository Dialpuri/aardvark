import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/Button'
import { Histogram, type HistogramStatus } from '@/components/Histogram'
import { floatIn, staggerContainer } from '@/lib/motion'
import { sampleNormal } from '@/lib/sample'
import styles from './ValidatePage.module.css'

type Tab = 'smiles' | 'file'

const examples = [
  { name: 'caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { name: 'aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { name: 'ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O' },
]

// Sample distributions for the demo report — one row per measured bond.
const results: {
  bond: string
  value: number
  status: HistogramStatus
  data: number[]
}[] = [
  {
    bond: 'C2=O2',
    value: 1.223,
    status: 'ok',
    data: sampleNormal(1.224, 0.012, 400, 11),
  },
  {
    bond: 'C6=O6',
    value: 1.262,
    status: 'warn',
    data: sampleNormal(1.231, 0.013, 400, 22),
  },
  {
    bond: 'C4=C5',
    value: 1.41,
    status: 'bad',
    data: sampleNormal(1.357, 0.011, 400, 33),
  },
]

const statusLabel: Record<HistogramStatus, string> = {
  ok: 'normal',
  warn: 'borderline',
  bad: 'outlier',
}

export default function ValidatePage() {
  const [tab, setTab] = useState<Tab>('smiles')
  const [smiles, setSmiles] = useState('CN1C=NC2=C1C(=O)N(C(=O)N2C)C')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div>
      <Navbar>
        <Link to="/" className={styles.back}>
          ← Back
        </Link>
      </Navbar>

      <motion.div
        className={styles.wrap}
        variants={floatIn}
        initial="hidden"
        animate="visible"
      >
        <h1 className={styles.title}>Validate a structure</h1>
        <p className={styles.subtitle}>
          Paste a SMILES string or upload a coordinate file. Everything runs
          locally in your browser.
        </p>

        <div className={styles.panel}>
          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'smiles'}
              className={`${styles.tab} ${tab === 'smiles' ? styles.tabActive : ''}`}
              onClick={() => setTab('smiles')}
            >
              SMILES string
            </button>
            <button
              role="tab"
              aria-selected={tab === 'file'}
              className={`${styles.tab} ${tab === 'file' ? styles.tabActive : ''}`}
              onClick={() => setTab('file')}
            >
              Molecule file
            </button>
          </div>

          <div className={styles.body}>
            {tab === 'smiles' ? (
              <>
                <textarea
                  className={styles.textarea}
                  spellCheck={false}
                  value={smiles}
                  onChange={(e) => setSmiles(e.target.value)}
                  aria-label="SMILES string"
                />
                <div className={styles.examples}>
                  <span className={styles.examplesLabel}>Try:</span>
                  {examples.map((ex, i) => (
                    <button
                      key={ex.name}
                      className={`${styles.chip} ${i === 0 ? styles.chipBrand : ''}`}
                      onClick={() => setSmiles(ex.smiles)}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.dropzone}>
                <span className={styles.dropIcon} />
                <div className={styles.dropTitle}>
                  Drop a <code>.mol</code> / <code>.sdf</code> /{' '}
                  <code>.pdb</code> file
                </div>
                <div className={styles.dropOr}>or</div>
                <Button variant="secondary" onClick={() => setSubmitted(true)}>
                  Browse files
                </Button>
              </div>
            )}

            <button
              className={styles.submit}
              disabled={tab === 'smiles' && smiles.trim() === ''}
              onClick={() => setSubmitted(true)}
            >
              Validate geometry →
            </button>

            {submitted && (
              <motion.div
                className={styles.results}
                variants={staggerContainer(0.1)}
                initial="hidden"
                animate="visible"
              >
                <p className={styles.note}>
                  Sample report — every bond scored against its reference
                  distribution.
                </p>
                {results.map((r) => (
                  <motion.div
                    key={r.bond}
                    className={styles.result}
                    variants={floatIn}
                  >
                    <div className={styles.resultHead}>
                      <span className={styles.resultBond}>{r.bond}</span>
                      <span className={styles.resultValue}>{r.value} Å</span>
                      <span
                        className={`${styles.resultStatus} ${styles[r.status]}`}
                      >
                        {statusLabel[r.status]}
                      </span>
                    </div>
                    <Histogram
                      data={r.data}
                      value={r.value}
                      status={r.status}
                      unit=" Å"
                      label={`${r.bond} bond length: ${r.value} Å (${statusLabel[r.status]})`}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        <p className={styles.privacy}>
          Your structure never leaves your machine. Reference distributions are
          bundled with the app.
        </p>
      </motion.div>
    </div>
  )
}
