/**
 * `acceptance-entrypoint-generator <json-ir> <generated-test-output>`: exits with
 * 0 when the files are written, 1 on an input, output, or generation error, and
 * 2 on wrong usage.
 */
import { planEntryPoints } from './generator'
import { parseFeature } from './ir'

export interface GeneratorIO {
  readText(path: string): string
  /** Writes `content` to `path`, creating the missing directories. */
  writeText(path: string, content: string): void
  reportError(message: string): void
}

const USAGE = 'usage: acceptance-entrypoint-generator <json-ir> <generated-test-output>'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function runGenerator(args: readonly string[], io: GeneratorIO): number {
  const [irPath, outDir] = args
  if (args.length !== 2 || irPath === undefined || outDir === undefined) {
    io.reportError(USAGE)
    return 2
  }
  try {
    const feature = parseFeature(JSON.parse(io.readText(irPath)))
    const { entryPoint, metadata } = planEntryPoints(feature, irPath, outDir)
    io.writeText(entryPoint.path, entryPoint.content)
    io.writeText(metadata.path, metadata.content)
    return 0
  } catch (error) {
    io.reportError(`${irPath}: ${errorMessage(error)}`)
    return 1
  }
}
