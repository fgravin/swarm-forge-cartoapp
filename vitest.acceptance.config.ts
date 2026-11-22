import { configDefaults, defineConfig } from 'vitest/config'

// Acceptance tests: `npm run acceptance`. The entry points generated from the
// feature files, and the tests of the pipeline that runs them. Kept out of
// `npm test`, coverage, CRAP, and mutation runs.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['acceptance/**/*.test.ts'],
    exclude: [...configDefaults.exclude, '.worktrees/**', 'target/**'],
  },
})
