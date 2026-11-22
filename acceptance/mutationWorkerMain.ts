// The persistent runner worker that `gherkin-mutator --runner-worker` starts for
// one feature: `tsx acceptance/mutationWorkerMain.ts <feature-stem>`. It reads one
// job per line on standard input and writes one response per line on standard
// output. Vitest's own output goes into the response, diagnostics to standard error.
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { createInterface } from 'node:readline'

import { MUTATED_IR_VARIABLE } from './entryPoint'
import { parseJob, planVitestRun, verdictOf, type Outcome } from './mutationWorker'

interface Response {
  readonly id: string
  readonly outcome: Outcome
  readonly output: string
  readonly error: string
  /** Nanoseconds. */
  readonly duration: number
}

const JOB_TIMEOUT_MS = 120_000

function readReport(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

function runJob(stem: string, line: string, started: bigint): Response {
  const elapsed = (): number => Number(process.hrtime.bigint() - started)
  const job = parseJob(line)
  const run = planVitestRun(stem, job)
  rmSync(run.reportPath, { force: true })
  const result = spawnSync('vitest', run.args, {
    encoding: 'utf8',
    env: { ...process.env, [MUTATED_IR_VARIABLE]: run.mutatedIr },
    timeout: JOB_TIMEOUT_MS,
  })
  const output = [result.stdout, result.stderr].join('')
  if (result.error) {
    return { id: job.id, outcome: 'infrastructure_error', output, error: result.error.message, duration: elapsed() }
  }
  return { id: job.id, ...verdictOf(readReport(run.reportPath)), output, duration: elapsed() }
}

function respond(stem: string, line: string): Response {
  const started = process.hrtime.bigint()
  try {
    return runJob(stem, line, started)
  } catch (error) {
    const duration = Number(process.hrtime.bigint() - started)
    return { id: '', outcome: 'infrastructure_error', output: '', error: String(error), duration }
  }
}

const [stem, ...extra] = process.argv.slice(2)
if (stem === undefined || extra.length > 0) {
  console.error('usage: tsx acceptance/mutationWorkerMain.ts <feature-stem>')
  process.exit(2)
}
createInterface({ input: process.stdin }).on('line', (line) => {
  process.stdout.write(`${JSON.stringify(respond(stem, line))}\n`)
})
