/** Where the normal acceptance run reads feature files and writes their IR. */

export interface FeatureBuild {
  readonly featurePath: string
  readonly irPath: string
}

export const FEATURES_DIR = 'features'
export const IR_DIR = 'build/acceptance'
export const GENERATED_DIR = 'acceptance/generated'

const FEATURE_FILE = /^(.+)\.feature$/

/** The feature files among the entries of the features directory, in name order, each with its IR path. */
export function planFeatureBuilds(entries: readonly string[]): readonly FeatureBuild[] {
  return [...entries].sort().flatMap((entry) => {
    const stem = FEATURE_FILE.exec(entry)?.[1]
    return stem === undefined ? [] : [{ featurePath: `${FEATURES_DIR}/${entry}`, irPath: `${IR_DIR}/${stem}.json` }]
  })
}
