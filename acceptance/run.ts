// The normal acceptance run, `npm run acceptance`: parses every feature file,
// generates the entry points, and runs them with the tests of this pipeline.
// Extra arguments go to Vitest.
import { buildEntryPoints, runOrExit } from './buildEntryPoints'

buildEntryPoints()
runOrExit('vitest', ['run', '--config', 'vitest.acceptance.config.ts', ...process.argv.slice(2)])
