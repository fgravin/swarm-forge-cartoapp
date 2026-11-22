// The Gherkin acceptance mutation run, `npm run acceptance:mutate`: regenerates
// the entry points, then runs `gherkin-mutator` on each feature file in turn with
// the runner worker of `mutationWorkerMain.ts`. Extra arguments, such as
// `--level soft`, go to `gherkin-mutator`.
import { spawnSync } from 'node:child_process'

import { buildEntryPoints } from './buildEntryPoints'
import { mutatorArgs } from './pipeline'

const failed = buildEntryPoints().filter((build) => {
  const result = spawnSync('gherkin-mutator', mutatorArgs(build, process.argv.slice(2)), { stdio: 'inherit' })
  if (result.error) console.error(`gherkin-mutator: ${result.error.message}`)
  return result.status !== 0
})
if (failed.length > 0) {
  console.error(`Gherkin mutation failed for ${failed.map((build) => build.featurePath).join(', ')}`)
  process.exitCode = 1
}
