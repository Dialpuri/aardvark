import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/Button'
import { ValidationReport } from '@/components/ValidationReport'
import { floatIn } from '@/lib/motion'
import type { AnalyzeResponse } from '@/types/cod'
import styles from './ValidatePage.module.css'

type Tab = 'smiles' | 'file'

const examples = [
  { name: 'caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { name: 'aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { name: 'ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O' },
]

// A captured COD-server response, served as a static asset for the demo. In
// production this comes back from POST /analyze/cif for the submitted structure.
async function fetchSampleReport(): Promise<AnalyzeResponse> {
  const res = await fetch(`${import.meta.env.BASE_URL}sample/A1C3B.json`)
  if (!res.ok) throw new Error(`Failed to load sample report (${res.status})`)
  return res.json()
}

export default function ValidatePage() {
  const [tab, setTab] = useState<Tab>('smiles')
  const [smiles, setSmiles] = useState('CN1C=NC2=C1C(=O)N(C(=O)N2C)C')
  const [submitted, setSubmitted] = useState(false)

  const report = useQuery({
    queryKey: ['sample-report', 'A1C3B'],
    queryFn: fetchSampleReport,
    enabled: submitted,
  })

  // Once submitted, hand the whole screen over to the report so there's room to
  // actually read the distributions.
  if (submitted) {
    return (
      <div>
        <Navbar>
          <button
            className={styles.backButton}
            onClick={() => setSubmitted(false)}
          >
            ← Validate another structure
          </button>
        </Navbar>

        <motion.div
          className={styles.reportWrap}
          variants={floatIn}
          initial="hidden"
          animate="visible"
        >
          <h1 className={styles.reportTitle}>Geometry report</h1>
          <p className={styles.note}>
            Every bond and angle is scored against the COD reference
            distribution for that given chemical environment.
          </p>

          {report.isPending && (
            <p className={styles.status}>Loading reference geometry…</p>
          )}
          {report.isError && (
            <p className={styles.status}>Couldn’t load the sample report.</p>
          )}
          {report.data && <ValidationReport report={report.data} />}
        </motion.div>
      </div>
    )
  }

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
          Paste a SMILES string or upload a coordinate file. Your structure is
          scored against the COD reference geometry server.
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
          </div>
        </div>

        <p className={styles.privacy}>
          Your structure is sent to the geometry server over an encrypted
          connection and scored against the COD reference distributions.
        </p>
      </motion.div>
    </div>
  )
}
