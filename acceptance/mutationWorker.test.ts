import { describe, expect, it } from 'vitest'

import { parseJob, planVitestRun, verdictOf, type MutationJob } from './mutationWorker'

const JOB: MutationJob = {
  id: 'm3',
  featureJson: 'build/acceptance-mutation/base-map/mutations/m3/feature.json',
  generatedDir: 'acceptance/generated',
  workDir: 'build/acceptance-mutation/base-map/mutations/m3',
}

const LINE = JSON.stringify({
  id: 'm3',
  feature_json: 'build/acceptance-mutation/base-map/mutations/m3/feature.json',
  generated_dir: 'acceptance/generated',
  work_dir: 'build/acceptance-mutation/base-map/mutations/m3',
})

describe('parseJob', () => {
  it('reads a job request line', () => {
    expect(parseJob(LINE)).toEqual(JOB)
  })

  it('ignores the fields it does not use', () => {
    expect(parseJob(JSON.stringify({ ...JSON.parse(LINE), timeout: '30s' }))).toEqual(JOB)
  })

  it.each([['[]'], ['null'], ['"m3"']])('refuses %s, which is not a job', (line) => {
    expect(() => parseJob(line)).toThrow('Malformed mutation job: not an object')
  })

  it.each([['id'], ['feature_json'], ['generated_dir'], ['work_dir']])('refuses a job without a %s string', (key) => {
    const job = { ...JSON.parse(LINE), [key]: 3 }

    expect(() => parseJob(JSON.stringify(job))).toThrow(`Malformed mutation job: ${key} must be a string`)
  })
})

describe('planVitestRun', () => {
  it("runs only the feature's generated entry point, with a JSON report in the job's work directory", () => {
    expect(planVitestRun('base-map', JOB)).toEqual({
      args: [
        'run',
        '--config',
        'vitest.acceptance.config.ts',
        '--reporter=json',
        '--outputFile=build/acceptance-mutation/base-map/mutations/m3/vitest-report.json',
        'acceptance/generated/base-map.acceptance.test.ts',
      ],
      mutatedIr: 'build/acceptance-mutation/base-map/mutations/m3/feature.json',
      reportPath: 'build/acceptance-mutation/base-map/mutations/m3/vitest-report.json',
    })
  })
})

describe('verdictOf', () => {
  const report = (fields: object): object => ({ numFailedTests: 0, numTotalTests: 4, success: true, ...fields })

  it('kills the mutation when a test fails', () => {
    expect(verdictOf(report({ numFailedTests: 1, success: false }))).toEqual({ outcome: 'test_failure', error: '' })
  })

  it('lets the mutation survive when every test passes', () => {
    expect(verdictOf(report({}))).toEqual({ outcome: 'test_success', error: '' })
  })

  it.each([
    ['no report', undefined],
    ['a report that is not an object', []],
    ['a report without a failed test count', { numTotalTests: 4, success: true }],
    ['a report without a test count', { numFailedTests: 0, success: true }],
  ])('is an error when Vitest wrote %s', (_case, written: unknown) => {
    expect(verdictOf(written)).toEqual({ outcome: 'infrastructure_error', error: 'Vitest wrote no test report' })
  })

  it.each([
    ['ran no test', report({ numTotalTests: 0 })],
    ['failed without a failing test', report({ success: false })],
    ['did not say it succeeded', report({ success: 'true' })],
  ])('is an error when Vitest %s', (_case, written: object) => {
    expect(verdictOf(written)).toEqual({ outcome: 'infrastructure_error', error: 'Vitest ran no test to a verdict' })
  })
})
