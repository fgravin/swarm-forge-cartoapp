// The normal acceptance run, `npm run acceptance`: parses every feature file,
// generates the entry points, and runs them with the tests of this pipeline.
// Extra arguments go to Vitest.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

import { runGenerator } from './generatorCommand'
import { NODE_GENERATOR_IO } from './nodeGeneratorIO'
import { FEATURES_DIR, GENERATED_DIR, IR_DIR, planFeatureBuilds } from './pipeline'

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) {
    console.error(`${command}: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

rmSync(GENERATED_DIR, { recursive: true, force: true })
mkdirSync(IR_DIR, { recursive: true })
for (const { featurePath, irPath } of planFeatureBuilds(readdirSync(FEATURES_DIR))) {
  run('gherkin-parser', [featurePath, irPath])
  const status = runGenerator([irPath, GENERATED_DIR], NODE_GENERATOR_IO)
  if (status !== 0) process.exit(status)
}
run('vitest', ['run', '--config', 'vitest.acceptance.config.ts', ...process.argv.slice(2)])
