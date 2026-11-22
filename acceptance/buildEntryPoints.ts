// What the acceptance and Gherkin mutation runs both start with: parse every
// feature file and generate its entry point. Exits the process at the first failure.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

import { runGenerator } from './generatorCommand'
import { NODE_GENERATOR_IO } from './nodeGeneratorIO'
import { FEATURES_DIR, GENERATED_DIR, IR_DIR, planFeatureBuilds, type FeatureBuild } from './pipeline'

export function runOrExit(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) {
    console.error(`${command}: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

export function buildEntryPoints(): readonly FeatureBuild[] {
  rmSync(GENERATED_DIR, { recursive: true, force: true })
  mkdirSync(IR_DIR, { recursive: true })
  const builds = planFeatureBuilds(readdirSync(FEATURES_DIR))
  for (const { featurePath, irPath } of builds) {
    runOrExit('gherkin-parser', [featurePath, irPath])
    const status = runGenerator([irPath, GENERATED_DIR], NODE_GENERATOR_IO)
    if (status !== 0) process.exit(status)
  }
  return builds
}
