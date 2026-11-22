import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

// Unit suite: `npm test`. `mutator` runs it once per mutant, from a copy of the
// tree, so every path here is relative to the working directory.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, '**/*.property.test.ts', '.worktrees/**', 'target/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
})
