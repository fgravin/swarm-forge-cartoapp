import type { Feature } from './ir'
import { expandFeature, type Execution } from './runtime'

/** What a generated entry point knows about the feature it was generated for. */
export interface EntryPoint {
  readonly feature: string
  readonly irPath: string
  readonly scenarios: readonly string[]
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
