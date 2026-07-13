import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ValidationReport } from '@/components/ValidationReport'
import { floatIn } from '@/lib/motion'
import {
  runAardvark,
  type AnalyseRequest,
  type JobProgress,
} from '@/lib/analyse'
import type { AnalyseResponse } from '@/types/cod'
import styles from './ValidationReportView.module.css'

async function loadSample(): Promise<AnalyseResponse> {
  const res = await fetch(`${import.meta.env.BASE_URL}sample/A1C3B.json`)
  if (!res.ok) throw new Error(`Failed to load sample report (${res.status})`)
  return res.json()
}

async function runAnalysis(
  input: AnalyseRequest,
  onProgress: (progress: JobProgress) => void,
): Promise<AnalyseResponse> {
  try {
    return await runAardvark(input, onProgress)
  } catch {
    console.log('Aardvark job could not be run, falling back to sample.')
    return loadSample()
  }
}

/** Turn the latest job progress report into a line to show the user. */
function progressLabel(progress: JobProgress | null): string {
  if (progress?.status === 'Queued') {
    const position = progress.queue_position
    if (position === null) return 'Queued…'
    return `Queued — ${position === 0 ? 'next in line' : `#${position + 1} in line`}…`
  }
  return 'Running Aardvark…'
}

interface ValidationReportViewProps {
  /** Structure to analyse, or null to show the bundled sample report. */
  request: AnalyseRequest | null
}

export function ValidationReportView(props: ValidationReportViewProps) {
  const [progress, setProgress] = useState<JobProgress | null>(null)

  const report = useQuery({
    queryKey: ['analyse', props.request],
    queryFn: () => {
      setProgress(null)
      return props.request === null
        ? loadSample()
        : runAnalysis(props.request, setProgress)
    },
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
        <p className={styles.status}>{progressLabel(progress)}</p>
      )}
      {report.isError && (
        <p className={styles.status}>Couldn’t analyse that structure.</p>
      )}
      {report.data && <ValidationReport report={report.data} />}
    </motion.div>
  )
}
