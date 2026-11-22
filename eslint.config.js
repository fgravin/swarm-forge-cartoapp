import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Dependency direction: components -> application -> domain, adapters -> application/domain.
const restrict = (patterns) => ['error', { patterns }]

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'coverage',
      'target',
      'build',
      'tmp',
      'acceptance/generated',
      'playwright-report',
      'test-results',
      '.metrics',
      '.swarmforge',
      '.worktrees',
      'swarmforge',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['src/**'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.{js,ts}', 'acceptance/**', 'qa/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': restrict([
        { group: ['vue', 'vue/*', 'maplibre-gl', 'maplibre-gl/*'], message: 'The domain is plain TypeScript.' },
        { group: ['**/application/**', '**/adapters/**', '**/components/**', '*.vue'], message: 'The domain depends on nothing outside itself.' },
      ]),
    },
  },
  {
    files: ['src/application/**'],
    rules: {
      'no-restricted-imports': restrict([
        { group: ['maplibre-gl', 'maplibre-gl/*'], message: 'Reach the map through a port the application owns.' },
        { group: ['**/adapters/**', '**/components/**', '*.vue'], message: 'The application depends on the domain only.' },
      ]),
    },
  },
  {
    files: ['src/adapters/**'],
    rules: {
      'no-restricted-imports': restrict([
        { group: ['**/components/**', '*.vue'], message: 'Adapters depend on the application and the domain only.' },
      ]),
    },
  },
)
