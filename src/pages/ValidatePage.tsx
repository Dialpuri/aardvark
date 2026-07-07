import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { ValidationInput } from '@/components/ValidationInput'
import { ValidationReportView } from '@/components/ValidationReportView'
import { floatIn } from '@/lib/motion'
import type { AnalyseRequest } from '@/lib/analyse'
import styles from './ValidatePage.module.css'

export default function ValidatePage() {
  const [searchParams, setSearchParams] = useSearchParams()
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
        <h1 className={styles.title}>Validate a structure with ACEDRG</h1>
        <p className={styles.subtitle}>
          Paste a SMILES string or upload a ligand coordinate file. An ACEDRG
          dictionary is created and scored against the COD reference geometry
          server.
        </p>

        <ValidationInput onSubmit={setRequest} />

        <p className={styles.privacy}>
          Your structure is sent to a server over an encrypted connection, an
          ACEDRG dictionary is created and scored against the COD reference
          distributions. Your data is not stored on the server, but if you are
          concerned about privacy you can host your own server, see{' '}
          <a href={''}>here</a>.
        </p>
      </motion.div>
    </div>
  )
}
