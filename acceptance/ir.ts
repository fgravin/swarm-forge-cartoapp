/**
 * The feature JSON IR that `gherkin-parser` writes, read once and narrowed
 * here. See `parser-spec.md` in the Acceptance Pipeline Specification.
 */
import { isObject, type JsonObject } from './json'

export interface Step {
  readonly keyword: string
  readonly text: string
}

/** One row of a scenario's examples table: column name to cell value. */
export type Example = Readonly<Record<string, string>>

export interface Scenario {
  readonly name: string
  readonly steps: readonly Step[]
  readonly examples: readonly Example[]
}

export interface Feature {
  readonly name: string
  readonly background: readonly Step[]
  readonly scenarios: readonly Scenario[]
}

function malformed(message: string): Error {
  return new Error(`Malformed feature IR: ${message}`)
}

function readObject(value: unknown, path: string): JsonObject {
  if (!isObject(value)) throw malformed(`${path} must be an object`)
  return value
}

function readString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw malformed(`${path} must be a string`)
  return value
}

function readArray<T>(value: unknown, path: string, readItem: (item: unknown, itemPath: string) => T): readonly T[] {
  if (!Array.isArray(value)) throw malformed(`${path} must be an array`)
  return value.map((item: unknown, index) => readItem(item, `${path}[${index}]`))
}

function readStep(value: unknown, path: string): Step {
  const step = readObject(value, path)
  return { keyword: readString(step.keyword, `${path}.keyword`), text: readString(step.text, `${path}.text`) }
}

function readExample(value: unknown, path: string): Example {
  const row = readObject(value, path)
  return Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, readString(cell, `${path}.${key}`)]))
}

function readScenario(value: unknown, path: string): Scenario {
  const scenario = readObject(value, path)
  return {
    name: readString(scenario.name, `${path}.name`),
    steps: readArray(scenario.steps, `${path}.steps`, readStep),
    examples: readArray(scenario.examples, `${path}.examples`, readExample),
  }
}

/** Narrows parsed JSON to a feature, or throws naming the first malformed field. */
export function parseFeature(json: unknown): Feature {
  const feature = readObject(json, 'feature')
  return {
    name: readString(feature.name, 'feature.name'),
    background: readArray(feature.background ?? [], 'feature.background', readStep),
    scenarios: readArray(feature.scenarios, 'feature.scenarios', readScenario),
  }
}
