import type { Feature } from './ir'
import { expandFeature, type Execution } from './runtime'

/** What a generated entry point knows about the feature it was generated for. */
export interface EntryPoint {
  readonly feature: string
  readonly irPath: string
  readonly scenarios: readonly string[]
}

/** Set by a Gherkin mutation run to the mutated IR that entry points load in place of their own. */
export const MUTATED_IR_VARIABLE = 'ACCEPTANCE_MUTATED_IR'

/** The IR an entry point loads: the mutated one when a mutation run names it, else the one it was generated from. */
export function irToLoad(entry: EntryPoint, env: Readonly<Record<string, string | undefined>>): string {
  return env[MUTATED_IR_VARIABLE] ?? entry.irPath
}

function sameStructure(entry: EntryPoint, feature: Feature): boolean {
  const scenarios = feature.scenarios.map((scenario) => scenario.name)
  return (
    feature.name === entry.feature &&
    scenarios.length === entry.scenarios.length &&
    scenarios.every((name, index) => name === entry.scenarios[index])
  )
}

/**
 * The executions an entry point runs for `feature`, the IR loaded when it runs.
 * Example values may differ from those it was generated with; its scenarios may not.
 */
export function selectExecutions(entry: EntryPoint, feature: Feature): readonly Execution[] {
  if (!sameStructure(entry, feature)) {
    throw new Error(`Stale entry point for ${entry.irPath}: regenerate it with \`npm run acceptance\``)
  }
  return expandFeature(feature)
}
