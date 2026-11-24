import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Dependency direction: components -> application -> domain, adapters -> application/domain.
const restrict = (patterns) => ['error', { patterns }]

// Browser APIs the testable modules reach only through a port an adapter implements.
const BROWSER_APIS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'requestAnimationFrame',
].map((name) => ({ name, message: 'Reach the browser through a port an adapter implements.' }))

// DOM types an adapter translates into the domain's own types before they cross inward.
const DOM_TYPES = Object.fromEntries(
  [
    'Event',
    'EventTarget',
    'UIEvent',
    'MouseEvent',
    'PointerEvent',
    'TouchEvent',
    'KeyboardEvent',
    'WheelEvent',
    'Node',
    'Element',
    'HTMLElement',
    'Document',
    'Window',
  ].map((name) => [name, { message: 'Translate DOM types in the adapter; use a type the domain or application owns.' }]),
)

const DOMAIN_IMPORTS = [
  { group: ['vue', 'vue/*', 'maplibre-gl', 'maplibre-gl/*'], message: 'The domain is plain TypeScript.' },
  { group: ['**/application/**', '**/adapters/**', '**/components/**', '*.vue'], message: 'The domain depends on nothing outside itself.' },
]

const APPLICATION_IMPORTS = [
  { group: ['maplibre-gl', 'maplibre-gl/*'], message: 'Reach the map through a port the application owns.' },
  { group: ['**/adapters/**', '**/components/**', '*.vue'], message: 'The application depends on the domain only.' },
]

// What GeoNames answers is read by the GeoNames place finder alone: the place search and its rules
// know the `PlaceFinder` port and the suggestions it finds, not the GeoNames requests and JSON.
const GEONAMES_FORMAT = {
  regex: '(^|/)(geonames|geonamesPlaceFinder|jsonAnswer)$',
  message: 'Only the GeoNames place finder reads what GeoNames answers. Ask the PlaceFinder port.',
}

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
    ignores: ['src/domain/geonames.ts', 'src/domain/geonames.*.ts'],
    rules: { 'no-restricted-imports': restrict([...DOMAIN_IMPORTS, GEONAMES_FORMAT]) },
  },
  {
    files: ['src/domain/geonames.ts', 'src/domain/geonames.*.ts'],
    rules: { 'no-restricted-imports': restrict(DOMAIN_IMPORTS) },
  },
  {
    files: ['src/application/**'],
    rules: { 'no-restricted-imports': restrict(APPLICATION_IMPORTS) },
  },
  {
    files: ['src/application/use*.ts'],
    rules: { 'no-restricted-imports': restrict([...APPLICATION_IMPORTS, GEONAMES_FORMAT]) },
  },
  {
    files: ['src/domain/**', 'src/application/**'],
    rules: {
      'no-restricted-globals': ['error', ...BROWSER_APIS],
      '@typescript-eslint/no-restricted-types': ['error', { types: DOM_TYPES }],
    },
  },
  {
    files: ['src/components/**', 'src/*.vue', 'src/main.ts'],
    rules: {
      'no-restricted-imports': restrict([
        { group: ['maplibre-gl', 'maplibre-gl/*'], message: 'Only the adapters touch MapLibre.' },
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
