import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ValidationReport } from '@/components/ValidationReport'
import { ReportModeToggle } from '@/components/ValidationReport/ReportModeToggle'
import { RemediationProvider } from '@/components/ValidationReport/RemediationProvider'
import { JobStatus } from '@/components/JobStatus'
import { JobError } from '@/components/JobError'
import { floatIn } from '@/lib/motion'
import {
  JobFailedError,
  runAardvark,
  type AnalyseRequest,
  type JobProgress,
} from '@/lib/analyse'
import { withMockDictionary } from '@/lib/mockDictionary'
import type { AnalyseResponse } from '@/types/cod'
import styles from './ValidationReportView.module.css'

async function loadSample(): Promise<AnalyseResponse> {
  const res = await fetch(`${import.meta.env.BASE_URL}sample/A1C3B.json`)
  if (!res.ok) throw new Error(`Failed to load sample report (${res.status})`)
  return withMockDictionary(await res.json())
}

async function runAnalysis(
  input: AnalyseRequest,
  onProgress: (progress: JobProgress) => void,
): Promise<AnalyseResponse> {
  try {
    return withMockDictionary(await runAardvark(input, onProgress))
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
      {report.isSuccess ? (
        <RemediationProvider>
          <div className={styles.reportHeader}>
            <h1 className={styles.reportTitle}>Geometry report</h1>
            <ReportModeToggle />
          </div>
          <p className={styles.note}>
            {props.request?.mode === 'model'
              ? 'Every observed bond and angle is scored against the COD reference distribution for that given chemical environment.'
              : 'Every idealised bond and angle is scored against the COD reference distribution for that given chemical environment.'}
          </p>
          <ValidationReport report={report.data} />
        </RemediationProvider>
      ) : report.isError && !report.isFetching ? (
        <JobError error={report.error} onRetry={() => report.refetch()} />
      ) : (
        // Initial load, or a retry in flight (`isError` still true but
        // re-fetching) — show the waiting state so a retry is visible.
        <JobStatus progress={progress} />
      )}
    </motion.div>
  )
}
