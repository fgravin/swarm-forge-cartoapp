import { configDefaults, defineConfig } from 'vitest/config'

// Property tests: `npm run test:property`. Kept out of `npm test`, coverage,
// CRAP, and mutation runs.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.property.test.ts'],
    exclude: [...configDefaults.exclude, '.worktrees/**', 'target/**'],
  },
})
