/**
 * The acceptance entrypoint generator: plans the thin Vitest entry point and the
 * metadata file for one feature IR. See `acceptance-generator.md` of the
 * Acceptance Pipeline Specification.
 *
 * The entry point loads the IR when it runs, so it depends on the scenario
 * structure only: changing example values does not change it or its hash.
 */
import { createHash } from 'node:crypto'
import { posix } from 'node:path'

import type { Feature } from './ir'

export interface GeneratedFile {
  readonly path: string
  readonly content: string
}

export interface EntryPointPlan {
  readonly entryPoint: GeneratedFile
  readonly metadata: GeneratedFile
}

const RUNTIME_ENTRY = 'acceptance/vitestEntry'

/** `features/Hunt The Wumpus.feature` -> `features-hunt-the-wumpus-feature.json`. */
export function metadataFileName(featurePath: string): string {
  const slug = featurePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug}.json`
}

function importPath(fromDir: string, target: string): string {
  const relative = posix.relative(fromDir, target)
  return relative.startsWith('.') ? relative : `./${relative}`
}

function entryPointContent(feature: Feature, irPath: string, outDir: string): string {
  const scenarios = feature.scenarios.map((scenario) => JSON.stringify(scenario.name)).join(', ')
  return [
    `// Generated from ${irPath} by acceptance/generate.ts. Do not edit.`,
    `import { describeFeature } from '${importPath(outDir, RUNTIME_ENTRY)}'`,
    '',
    'describeFeature({',
    `  feature: ${JSON.stringify(feature.name)},`,
    `  irPath: ${JSON.stringify(irPath)},`,
    `  scenarios: [${scenarios}],`,
    '})',
    '',
  ].join('\n')
}

function implementationHash(files: readonly GeneratedFile[]): string {
  const hash = createHash('sha256')
  for (const file of files) hash.update(file.content)
  return `sha256:${hash.digest('hex')}`
}

function metadataContent(featurePath: string, irPath: string, generated: readonly GeneratedFile[]): string {
  const metadata = {
    schema_version: 1,
    feature_path: featurePath,
    ir_path: irPath,
    implementation_hash: implementationHash(generated),
    hash_scope: 'generated_files',
    generated_files: generated.map((file) => file.path),
  }
  return `${JSON.stringify(metadata, null, 2)}\n`
}

/** The files to write for the feature parsed into `irPath` (`build/acceptance/<stem>.json`). */
export function planEntryPoints(feature: Feature, irPath: string, outDir: string): EntryPointPlan {
  const stem = posix.basename(irPath, '.json')
  const featurePath = `features/${stem}.feature`
  const entryPoint = {
    path: posix.join(outDir, `${stem}.acceptance.test.ts`),
    content: entryPointContent(feature, irPath, outDir),
  }
  const metadata = {
    path: posix.join(outDir, 'metadata', metadataFileName(featurePath)),
    content: metadataContent(featurePath, irPath, [entryPoint]),
  }
  return { entryPoint, metadata }
}
