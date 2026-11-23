/**
 * The `gherkin-mutator` runner adapter: reads a job, plans the Vitest run of the
 * feature's generated entry point against the job's mutated IR, and turns the
 * Vitest JSON report into the job's outcome. See "Runner Adapter" in
 * `mutator-spec.md` of the Acceptance Pipeline Specification.
 * `mutationWorkerMain.ts` is the worker process that runs it.
 */
import { posix } from 'node:path'

import { entryPointPath } from './generator'
import { isObject } from './json'

export interface MutationJob {
  readonly id: string
  readonly featureJson: string
  readonly generatedDir: string
  readonly workDir: string
}

export type Outcome = 'test_success' | 'test_failure' | 'infrastructure_error'

export interface Verdict {
  readonly outcome: Outcome
  readonly error: string
}

/** How to run the generated entry point of one feature against a job's mutated IR. */
export interface VitestRun {
  readonly args: readonly string[]
  /** The mutated IR, for `MUTATED_IR_VARIABLE`. */
  readonly mutatedIr: string
  readonly reportPath: string
}

/** One line of standard input, as `gherkin-mutator` writes it; throws when it is not a job. */
export function parseJob(line: string): MutationJob {
  const job: unknown = JSON.parse(line)
  if (!isObject(job)) throw new Error('Malformed mutation job: not an object')
  const field = (key: string): string => {
    const value = job[key]
    if (typeof value !== 'string') throw new Error(`Malformed mutation job: ${key} must be a string`)
    return value
  }
  return {
    id: field('id'),
    featureJson: field('feature_json'),
    generatedDir: field('generated_dir'),
    workDir: field('work_dir'),
  }
}

/** Runs only the entry point of `features/<stem>.feature`, and writes its report into the job's work directory. */
export function planVitestRun(stem: string, job: MutationJob): VitestRun {
  const reportPath = posix.join(job.workDir, 'vitest-report.json')
  return {
    args: [
      'run',
      '--config',
      'vitest.acceptance.config.ts',
      '--reporter=json',
      `--outputFile=${reportPath}`,
      entryPointPath(job.generatedDir, stem),
    ],
    mutatedIr: job.featureJson,
    reportPath,
  }
}

const NO_REPORT: Verdict = { outcome: 'infrastructure_error', error: 'Vitest wrote no test report' }
const NO_TEST_RAN: Verdict = { outcome: 'infrastructure_error', error: 'Vitest ran no test to a verdict' }

/** A failing test kills the mutation and passing tests let it survive; a run without a test verdict is an error. */
export function verdictOf(report: unknown): Verdict {
  if (!isObject(report)) return NO_REPORT
  const { numFailedTests, numTotalTests, success } = report
  if (typeof numFailedTests !== 'number' || typeof numTotalTests !== 'number') return NO_REPORT
  if (numFailedTests > 0) return { outcome: 'test_failure', error: '' }
  return success === true && numTotalTests > 0 ? { outcome: 'test_success', error: '' } : NO_TEST_RAN
}
