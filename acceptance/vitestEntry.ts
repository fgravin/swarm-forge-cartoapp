// What a generated entry point calls: one Vitest test per scenario execution of
// the IR, each run through the step handlers against a fresh world.
import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'

import { selectExecutions, type EntryPoint } from './entryPoint'
import { parseFeature } from './ir'
import { runExecution } from './runtime'
import { createWorld, STEP_HANDLERS } from './steps'

export function describeFeature(entry: EntryPoint): void {
  const feature = parseFeature(JSON.parse(readFileSync(entry.irPath, 'utf8')))
  const executions = selectExecutions(entry, feature)
  describe(entry.feature, () => {
    for (const execution of executions) {
      it(execution.name, () => runExecution(execution, createWorld, STEP_HANDLERS))
    }
  })
}
