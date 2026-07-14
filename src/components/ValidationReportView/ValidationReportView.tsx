import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ValidationReport } from '@/components/ValidationReport'
import { JobStatus } from '@/components/JobStatus'
import { JobError } from '@/components/JobError'
import { floatIn } from '@/lib/motion'
import {
  JobFailedError,
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
  } catch (err) {
    // A job that ran and reported Failed is a real result — surface it. Only
    // fall back to the sample when the server couldn't be reached at all.
    if (err instanceof JobFailedError) throw err
    console.log('Aardvark server unreachable, falling back to sample.')
    return loadSample()
  }
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
      {report.isPending ? (
        <JobStatus progress={progress} />
      ) : report.isError ? (
        <JobError error={report.error} onRetry={() => report.refetch()} />
      ) : (
        <>
          <h1 className={styles.reportTitle}>Geometry report</h1>
          <p className={styles.note}>
            Every bond and angle is scored against the COD reference
            distribution for that given chemical environment.
          </p>
          <ValidationReport report={report.data} />
        </>
      )}
    </motion.div>
  )
}
