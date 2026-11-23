/**
 * The acceptance runtime: expands a feature into scenario executions and runs
 * each one through the project step handlers. See the runtime and step handler
 * contracts in `acceptance-generator.md` of the Acceptance Pipeline Specification.
 */
import type { Example, Feature, Step } from './ir'

/** One run of a scenario: background steps, then scenario steps, with one example row. */
export interface Execution {
  readonly name: string
  readonly example: Example
  readonly steps: readonly Step[]
}

type StepAction<W> = (world: W, captures: readonly string[]) => void | Promise<void>

export interface StepHandler<W> {
  readonly pattern: RegExp
  readonly run: StepAction<W>
}

/**
 * A handler for the steps whose text, placeholders already replaced by example
 * values, matches `pattern`. It receives the pattern's capture groups.
 */
export function step<W>(pattern: RegExp, run: StepAction<W>): StepHandler<W> {
  return { pattern, run }
}

const NO_EXAMPLE: readonly Example[] = [{}]

export function expandFeature(feature: Feature): readonly Execution[] {
  return feature.scenarios.flatMap((scenario) => {
    const rows = scenario.examples.length > 0 ? scenario.examples : NO_EXAMPLE
    return rows.map((example, index) => ({
      name: `${scenario.name}/example_${index + 1}`,
      example,
      steps: [...feature.background, ...scenario.steps],
    }))
  })
}

const PLACEHOLDER = /<([A-Za-z0-9_]+)>/g

function resolveText(execution: Execution, each: Step): string {
  return each.text.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = execution.example[name]
    if (value === undefined) {
      throw new Error(`${execution.name}: no example value for ${placeholder} in "${each.keyword} ${each.text}"`)
    }
    return value
  })
}

interface Dispatch<W> {
  readonly run: StepAction<W>
  readonly captures: readonly string[]
}

function dispatch<W>(execution: Execution, each: Step, handlers: readonly StepHandler<W>[]): Dispatch<W> {
  const text = resolveText(execution, each)
  const matches = handlers.flatMap((handler) => {
    const match = handler.pattern.exec(text)
    return match ? [{ run: handler.run, captures: match.slice(1) }] : []
  })
  const [only, ...others] = matches
  if (!only) throw new Error(`${execution.name}: unsupported step "${each.keyword} ${text}"`)
  if (others.length > 0) throw new Error(`${execution.name}: ambiguous step "${each.keyword} ${text}"`)
  return only
}

/** Runs the steps of `execution` in order against a fresh world; rejects at the first failing step. */
export async function runExecution<W>(
  execution: Execution,
  createWorld: () => W,
  handlers: readonly StepHandler<W>[],
): Promise<void> {
  const world = createWorld()
  for (const each of execution.steps) {
    const { run, captures } = dispatch(execution, each, handlers)
    await run(world, captures)
  }
}
