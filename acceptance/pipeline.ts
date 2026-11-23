/** Where the acceptance and Gherkin mutation runs read feature files and write their IR and work files. */

export interface FeatureBuild {
  readonly stem: string
  readonly featurePath: string
  readonly irPath: string
}

export const FEATURES_DIR = 'features'
export const IR_DIR = 'build/acceptance'
export const GENERATED_DIR = 'acceptance/generated'
export const MUTATION_WORK_DIR = 'build/acceptance-mutation'

const FEATURE_FILE = /^(.+)\.feature$/

/** The feature files among the entries of the features directory, in name order, each with its IR path. */
export function planFeatureBuilds(entries: readonly string[]): readonly FeatureBuild[] {
  return [...entries].sort().flatMap((entry) => {
    const stem = FEATURE_FILE.exec(entry)?.[1]
    return stem === undefined ? [] : [{ stem, featurePath: `${FEATURES_DIR}/${entry}`, irPath: `${IR_DIR}/${stem}.json` }]
  })
}

/**
 * The `gherkin-mutator` arguments that mutate one feature against the generated
 * entry points, through the runner worker of `mutationWorkerMain.ts`. `extra`,
 * such as `--level soft`, follows them.
 */
export function mutatorArgs(build: FeatureBuild, extra: readonly string[]): readonly string[] {
  return [
    '--feature',
    build.featurePath,
    '--generated-dir',
    GENERATED_DIR,
    '--work-dir',
    `${MUTATION_WORK_DIR}/${build.stem}`,
    '--runner-worker',
    `tsx acceptance/mutationWorkerMain.ts ${build.stem}`,
    ...extra,
  ]
}
