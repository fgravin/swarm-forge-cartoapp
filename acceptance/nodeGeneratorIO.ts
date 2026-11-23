import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import type { GeneratorIO } from './generatorCommand'

export const NODE_GENERATOR_IO: GeneratorIO = {
  readText: (path) => readFileSync(path, 'utf8'),
  writeText: (path, content) => {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  },
  reportError: (message) => {
    console.error(message)
  },
}
