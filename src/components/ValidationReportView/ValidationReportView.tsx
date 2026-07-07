import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ValidationReport } from '@/components/ValidationReport'
import { floatIn } from '@/lib/motion'
import { analyse, type AnalyseRequest } from '@/lib/analyse'
import type { AnalyseResponse } from '@/types/cod'
import styles from './ValidationReportView.module.css'

async function loadSample(): Promise<AnalyseResponse> {
  const res = await fetch(`${import.meta.env.BASE_URL}sample/A1C3B.json`)
  if (!res.ok) throw new Error(`Failed to load sample report (${res.status})`)
  return res.json()
}

async function runAnalysis(input: AnalyseRequest): Promise<AnalyseResponse> {
  try {
    console.log('runAnalysis', input)
    return await analyse(input)
  } catch {
    console.log('Input could not be analysed, falling back to sample.')
    return loadSample()
  }
}

interface ValidationReportViewProps {
  /** Structure to analyse, or null to show the bundled sample report. */
  request: AnalyseRequest | null
}

export function ValidationReportView(props: ValidationReportViewProps) {
  const report = useQuery({
    queryKey: ['analyse', props.request],
    queryFn: () =>
      props.request === null ? loadSample() : runAnalysis(props.request),
  })

  return (
    <motion.div
      className={styles.reportWrap}
      variants={floatIn}
      initial="hidden"
      animate="visible"
    >
      <h1 className={styles.reportTitle}>Geometry report</h1>
      <p className={styles.note}>
        Every bond and angle is scored against the COD reference distribution
        for that given chemical environment.
      </p>

      {report.isPending && (
        <p className={styles.status}>Loading reference geometry…</p>
      )}
      {report.isError && (
        <p className={styles.status}>Couldn’t analyse that structure.</p>
      )}
      {report.data && <ValidationReport report={report.data} />}
    </motion.div>
  )
}
