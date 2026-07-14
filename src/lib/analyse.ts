import type { AnalyseResponse } from '@/types/cod'

/** Input formats Aardvark accepts. The server currently only runs `smiles`. */
export type InputFormat = 'smiles' | 'inchi' | 'cif' | 'mol' | 'pdb'

/**
 * Which of the two validation paths a request follows:
 * - `dictionary` — validate *idealised* restraint geometry (an ACEDRG/restraints
 *   dictionary, or a SMILES/InChI the server runs ACEDRG on first).
 * - `model` — validate *observed* geometry measured from real coordinates (a
 *   PDB/mmCIF model naming a ligand, or a standalone ligand coordinate file).
 */
export type AnalyseMode = 'dictionary' | 'model'

/**
 * A structure to run through Aardvark: the raw text plus a tag telling the
 * server how to read it, and an optional ligand code. The text is base64
 * encoded before it goes on the wire (see {@link spawnJob}).
 */
export interface AnalyseRequest {
  mode: AnalyseMode
  format: InputFormat
  /** SMILES / InChI string, or the full text of a CIF / MOL / PDB file. */
  data: string
  /** Which ligand to validate — `model` path only (names the residue in a model). */
  comp_id?: string
}

/**
 * Base URL of the Aardvark job server. Defaults to the same-origin `/api` path,
 * which in dev is either served by the mock or proxied to a real backend (see
 * `vite.config.ts`). Set `VITE_AARDVARK_URL` to hit a server on another origin
 * directly (that server must send CORS headers).
 */
export const AARDVARK_BASE: string = import.meta.env.VITE_AARDVARK_URL ?? '/api'

// https://quicillith.pl/run_aardvark

/** Terminal + in-flight states a job can report over the websocket. */
export type JobStatus = 'Pending' | 'Finished' | 'Failed' | 'Queued'

/** Why a job ended up in the `Failed` state. */
export type FailureReason = 'TimedOut' | 'JobProcessError' | 'SetupError'

/** Captured child-process output; `null` while the job is still pending. */
export interface JobOutput {
  stdout: string
  stderr: string
}

/** A single progress report streamed over `GET /ws/{job_id}`. */
export interface JobProgress {
  status: JobStatus
  /** Only set while the job is `Queued`. Counted from 0. */
  queue_position: number | null
  /** `null` while pending, on timeout, or on child-process I/O error. */
  job_output: JobOutput | null
  /** Only carries a value for `SetupError` failures. */
  error_message: string | null
  /** Only set when `status` is `Failed`. */
  failure_reason: FailureReason | null
}

/** Reply from `POST /run_aardvark`. */
interface RunAardvarkResponse {
  /** `null` on error. */
  job_id: string | null
  /** `null` on success. */
  error_message: string | null
  /** `null` when the job runs immediately (no queue). Counted from 0. */
  queue_position: number | null
}

/** A spawned job we can track and, once finished, collect results from. */
interface AardvarkJob {
  jobId: string
  /** `null` if the job started straight away rather than being queued. */
  queuePosition: number | null
}

const FAILURE_LABEL: Record<FailureReason, string> = {
  TimedOut: 'The job timed out.',
  JobProcessError: 'The Aardvark process failed.',
  SetupError: 'Job setup failed.',
}

/** Map a dropped/selected file's extension to an {@link InputFormat}. */
export function formatFromFilename(name: string): InputFormat | null {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'cif':
    case 'mmcif':
      return 'cif'
    case 'mol':
    case 'sdf':
    case 'mol2':
      return 'mol'
    case 'pdb':
    case 'ent':
      return 'pdb'
    default:
      return null
  }
}

/** Build the request the caller hands on for analysis from raw structure text. */
export function wrapInput(
  mode: AnalyseMode,
  format: InputFormat,
  data: string,
  comp_id?: string,
): AnalyseRequest {
  return { mode, format, data, comp_id }
}

/** UTF-8 → base64, the encoding `POST /run_aardvark` expects for `data`. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Websocket URL for a job, resolved against the (possibly relative) base. */
function jobSocketUrl(jobId: string): string {
  const url = new URL(`${AARDVARK_BASE}/ws/${jobId}`, window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

/**
 * Thrown when a job runs but reports `Failed` (as opposed to never starting or
 * losing its connection). Lets callers tell a genuine job failure apart from an
 * unreachable server, e.g. to show the error rather than fall back to a sample.
 */
export class JobFailedError extends Error {
  /** The server's reason for the failure, when it gave one. */
  readonly reason: FailureReason | null
  constructor(message: string, reason: FailureReason | null = null) {
    super(message)
    this.name = 'JobFailedError'
    this.reason = reason
  }
}

/** Best-effort human-readable message for a failed job. */
function jobFailureMessage(progress: JobProgress): string {
  if (progress.error_message) return progress.error_message
  if (progress.failure_reason) return FAILURE_LABEL[progress.failure_reason]
  return 'The Aardvark job failed.'
}

/** `POST /run_aardvark` — spawn (or queue) a job and return its id. */
async function spawnJob(input: AnalyseRequest): Promise<AardvarkJob> {
  const res = await fetch(`${AARDVARK_BASE}/run_aardvark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: input.mode,
      format: input.format,
      data: toBase64(input.data),
      comp_id: input.comp_id,
    }),
  })

  const body = (await res
    .json()
    .catch(() => null)) as RunAardvarkResponse | null
  if (!res.ok || !body?.job_id) {
    throw new Error(
      body?.error_message ?? `Aardvark request failed (${res.status})`,
    )
  }
  return { jobId: body.job_id, queuePosition: body.queue_position }
}

/**
 * Follow a job over its websocket until it finishes, forwarding every progress
 * report to `onProgress`. Resolves once the job reports `Finished`; rejects if
 * it fails or the connection drops before a terminal status arrives.
 */
function trackJob(
  jobId: string,
  onProgress?: (progress: JobProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(jobSocketUrl(jobId))
    let settled = false

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
      socket.close()
    }

    socket.onmessage = (event) => {
      let progress: JobProgress
      try {
        progress = JSON.parse(event.data as string)
      } catch {
        return // Ignore anything that isn't a progress report.
      }
      onProgress?.(progress)
      if (progress.status === 'Finished') finish(resolve)
      else if (progress.status === 'Failed')
        finish(() =>
          reject(
            new JobFailedError(
              jobFailureMessage(progress),
              progress.failure_reason,
            ),
          ),
        )
    }

    // The server closes the socket when the job completes; if that happens
    // before we saw a terminal status, treat it as a failure.
    socket.onclose = () =>
      finish(() =>
        reject(new Error('Connection to the Aardvark server closed early.')),
      )
    socket.onerror = () =>
      finish(() => reject(new Error('Lost connection to the Aardvark server.')))
  })
}

/** `GET /get_json_result/{job_id}` — read a finished Aardvark job's output. */
async function fetchJsonResult(jobId: string): Promise<AnalyseResponse> {
  const res = await fetch(`${AARDVARK_BASE}/get_json_result/${jobId}`)
  if (!res.ok) throw new Error(`Couldn't read Aardvark result (${res.status})`)
  return res.json()
}

/**
 * Run a structure through Aardvark end to end: spawn the job, follow it over a
 * websocket (reporting progress via `onProgress`), then fetch and return the
 * parsed JSON result once it finishes.
 */
export async function runAardvark(
  input: AnalyseRequest,
  onProgress?: (progress: JobProgress) => void,
): Promise<AnalyseResponse> {
  const job = await spawnJob(input)
  if (job.queuePosition !== null) {
    onProgress?.({
      status: 'Queued',
      queue_position: job.queuePosition,
      job_output: null,
      error_message: null,
      failure_reason: null,
    })
  }
  await trackJob(job.jobId, onProgress)
  return fetchJsonResult(job.jobId)
}
