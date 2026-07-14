import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Duplex } from 'node:stream'
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Dev-only stand-in for the Aardvark job server. It mimics the real async flow
 * — `POST /api/run_aardvark` spawns a job, `GET /api/ws/{id}` streams progress
 * over a websocket, and `GET /api/get_json_result/{id}` returns the captured
 * sample response — without actually running Aardvark. Enough to exercise the
 * client's spawn → track → collect path end to end. Swap in the real server by
 * setting `VITE_AARDVARK_PROXY` (see `vite.config.ts`).
 *
 * The `run_aardvark` body now also carries `mode` (`dictionary` | `model`) and an
 * optional `comp_id`; the mock ignores both and only reads the `data` directive.
 *
 * To exercise the unhappy paths, put a directive in the input structure text
 * (the SMILES box, etc.); it's decoded from the request and matched
 * case-insensitively. Directives take an optional `=N` argument:
 *
 *   ok            spawn → pending → finished (the default)
 *   queue[=N]     spawn queued at position N (default 3), counting down to 0
 *   slow[=N]      stay pending for N seconds (default 5) before finishing
 *   fail          finish as Failed (JobProcessError)
 *   timeout       finish as Failed (TimedOut)
 *   setup         finish as Failed (SetupError, with an error_message)
 *   reject        POST /run_aardvark refuses with 400 + error_message
 *
 * e.g. a SMILES of `queue=5` starts fifth in the queue, `slow=10 CCO` finishes
 * after ten seconds. Anything without a directive gets the happy path.
 */
export function mockAardvark(): Plugin {
  const samplePath = fileURLToPath(
    new URL('../public/sample/A1C3B.json', import.meta.url),
  )

  // Remember each spawned job's scenario so the websocket handler (a separate
  // request) can replay the right sequence of progress reports for it.
  const jobs = new Map<string, Scenario>()

  return {
    name: 'mock-aardvark',
    apply: 'serve',
    configureServer(server) {
      // POST /api/run_aardvark → spawn a job and hand back its id.
      server.middlewares.use('/api/run_aardvark', (req, res, next) => {
        if (req.method !== 'POST') return next()
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          const scenario = scenarioFromBody(Buffer.concat(chunks))
          res.setHeader('Content-Type', 'application/json')

          if (scenario.kind === 'reject') {
            res.statusCode = 400
            res.end(
              JSON.stringify({
                job_id: null,
                error_message:
                  'Mock server rejected the job (reject directive).',
                queue_position: null,
              }),
            )
            return
          }

          const jobId = randomUUID()
          jobs.set(jobId, scenario)
          res.statusCode = scenario.kind === 'queue' ? 202 : 201
          res.end(
            JSON.stringify({
              job_id: jobId,
              error_message: null,
              queue_position:
                scenario.kind === 'queue' ? scenario.queueStart : null,
            }),
          )
        })
      })

      // GET /api/get_json_result/{id} → stream the sample Aardvark output.
      server.middlewares.use('/api/get_json_result/', (req, res, next) => {
        if (req.method !== 'GET') return next()
        void readFile(samplePath, 'utf8').then(
          (body) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(body)
          },
          (err: unknown) => {
            res.statusCode = 500
            res.end(String(err))
          },
        )
      })

      // GET /api/ws/{id} → a websocket that replays the job's scenario.
      server.httpServer?.on('upgrade', (req, socket) => {
        // Only claim our own path; let Vite's HMR handle everything else.
        if (!req.url?.startsWith('/api/ws/')) return
        const jobId = req.url.slice('/api/ws/'.length)
        const scenario = jobs.get(jobId) ?? { kind: 'ok' }
        jobs.delete(jobId)
        acceptWebSocket(socket, req.headers['sec-websocket-key'] ?? '')
        void playScenario(socket, scenario)
      })
    },
  }
}

/** Terminal failure reasons the client understands (mirrors `analyse.ts`). */
type FailureReason = 'TimedOut' | 'JobProcessError' | 'SetupError'

/** A parsed test directive telling the mock how a job should behave. */
type Scenario =
  | { kind: 'ok' }
  | { kind: 'reject' }
  | { kind: 'queue'; queueStart: number }
  | { kind: 'slow'; delayMs: number }
  | { kind: 'fail'; failureReason: FailureReason; errorMessage: string | null }

/** Pull the `{ data }` field out of a `run_aardvark` body and read its directive. */
function scenarioFromBody(body: Buffer): Scenario {
  let text = ''
  try {
    const data = (JSON.parse(body.toString('utf8')) as { data?: string }).data
    if (data) text = Buffer.from(data, 'base64').toString('utf8')
  } catch {
    // Malformed body — fall through to the happy path.
  }
  return scenarioFromInput(text)
}

/** Interpret the leading directive (if any) in the decoded input text. */
function scenarioFromInput(text: string): Scenario {
  const match = /\b(ok|queue|slow|fail|timeout|setup|reject)(?:=(\d+))?/i.exec(
    text,
  )
  if (!match) return { kind: 'ok' }
  const arg = match[2] ? Number(match[2]) : undefined
  switch (match[1].toLowerCase()) {
    case 'queue':
      return { kind: 'queue', queueStart: arg ?? 3 }
    case 'slow':
      return { kind: 'slow', delayMs: (arg ?? 5) * 1000 }
    case 'fail':
      return {
        kind: 'fail',
        failureReason: 'JobProcessError',
        errorMessage: null,
      }
    case 'timeout':
      return { kind: 'fail', failureReason: 'TimedOut', errorMessage: null }
    case 'setup':
      return {
        kind: 'fail',
        failureReason: 'SetupError',
        errorMessage: 'Mock setup failure: could not prepare the job.',
      }
    case 'reject':
      return { kind: 'reject' }
    default:
      return { kind: 'ok' }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Replay a scenario's progress reports over the socket, then close it. */
async function playScenario(socket: Duplex, scenario: Scenario): Promise<void> {
  switch (scenario.kind) {
    case 'queue':
      for (let pos = scenario.queueStart; pos > 0; pos--) {
        sendTextFrame(socket, progress('Queued', { queue_position: pos }))
        await sleep(700)
      }
      sendTextFrame(socket, progress('Pending'))
      await sleep(600)
      sendTextFrame(socket, progress('Finished'))
      break
    case 'slow':
      sendTextFrame(socket, progress('Pending'))
      await sleep(scenario.delayMs)
      sendTextFrame(socket, progress('Finished'))
      break
    case 'fail':
      sendTextFrame(socket, progress('Pending'))
      await sleep(600)
      sendTextFrame(
        socket,
        progress('Failed', {
          failure_reason: scenario.failureReason,
          error_message: scenario.errorMessage,
        }),
      )
      break
    default:
      sendTextFrame(socket, progress('Pending'))
      await sleep(600)
      sendTextFrame(socket, progress('Finished'))
  }
  socket.end()
}

/** A progress report matching the client's `JobProgress` shape. */
function progress(
  status: 'Queued' | 'Pending' | 'Finished' | 'Failed',
  extra: Partial<{
    queue_position: number
    failure_reason: FailureReason
    error_message: string | null
  }> = {},
): string {
  return JSON.stringify({
    status,
    queue_position: extra.queue_position ?? null,
    job_output: status === 'Finished' ? { stdout: 'done', stderr: '' } : null,
    error_message: extra.error_message ?? null,
    failure_reason: extra.failure_reason ?? null,
  })
}

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

/** Complete the RFC 6455 handshake, upgrading the raw socket to a websocket. */
function acceptWebSocket(socket: Duplex, key: string): void {
  const accept = createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  )
}

/** Send one unmasked text frame (server → client) for payloads < 64 KiB. */
function sendTextFrame(socket: Duplex, text: string): void {
  const payload = Buffer.from(text, 'utf8')
  const header =
    payload.length < 126
      ? Buffer.from([0x81, payload.length])
      : Buffer.from([0x81, 126, payload.length >> 8, payload.length & 0xff])
  socket.write(Buffer.concat([header, payload]))
}
