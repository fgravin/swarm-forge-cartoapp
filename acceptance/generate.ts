// acceptance-entrypoint-generator <json-ir> <generated-test-output>
import { runGenerator } from './generatorCommand'
import { NODE_GENERATOR_IO } from './nodeGeneratorIO'

process.exitCode = runGenerator(process.argv.slice(2), NODE_GENERATOR_IO)
