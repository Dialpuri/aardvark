import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { PathChooser } from '@/components/PathChooser'
import { ValidationInput } from '@/components/ValidationInput'
import { ValidationReportView } from '@/components/ValidationReportView'
import { floatIn } from '@/lib/motion'
import type { AnalyseMode, AnalyseRequest } from '@/lib/analyse'
import styles from './ValidatePage.module.css'

/** Page heading + blurb for each path's input step. */
const MODE_COPY: Record<AnalyseMode, { title: string; subtitle: string }> = {
  dictionary: {
    title: 'Validate a dictionary',
    subtitle:
      'Paste a SMILES / InChI string or upload a restraints dictionary. An ACEDRG dictionary is created (if needed) and its target geometry is scored against the COD reference server.',
  },
  model: {
    title: 'Validate a model or ligand',
    subtitle:
      'Upload a coordinate model naming a ligand, or a standalone ligand file. The geometry as built is measured and scored against the COD reference server.',
  },
}

export default function ValidatePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<AnalyseMode | null>(null)
  const [request, setRequest] = useState<AnalyseRequest | null>(null)

  // `/validate?sample` (linked from the landing page) opens straight into the
  // bundled sample report; a submitted structure passes its own request.
  const showSample = searchParams.has('sample')

  // Once there's something to report on, hand the whole screen over to the
  // report so there's room to actually read the distributions.
  if (request !== null || showSample) {
    return (
      <div>
        <Navbar>
          <button
            className={styles.backButton}
            onClick={() => {
              setRequest(null)
              if (showSample) setSearchParams({}, { replace: true })
            }}
          >
            ← Validate another structure
          </button>
        </Navbar>

        <ValidationReportView request={request} />
      </div>
    )
  }

  const copy = mode ? MODE_COPY[mode] : null

  return (
    <div>
      <Navbar>
        {mode ? (
          <button className={styles.backButton} onClick={() => setMode(null)}>
            ← Choose a different check
          </button>
        ) : (
          <Link to="/" className={styles.back}>
            ← Back
          </Link>
        )}
      </Navbar>

      <motion.div
        className={styles.wrap}
        variants={floatIn}
        initial="hidden"
        animate="visible"
      >
        {copy ? (
          <>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.subtitle}>{copy.subtitle}</p>
            <ValidationInput mode={mode!} onSubmit={setRequest} />
            <p className={styles.privacy}>
              Your structure is sent to a server over an encrypted connection
              and scored against the COD reference distributions. Your data is
              not stored on the server, but if you are concerned about privacy
              you can host your own server, see <a href={''}>here</a>.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>What would you like to validate?</h1>
            <p className={styles.subtitle}>
              Check either the idealised geometry in a dictionary, or the
              geometry as actually built in a model or ligand.
            </p>
            <PathChooser onChoose={setMode} />
          </>
        )}
      </motion.div>
    </div>
  )
}
