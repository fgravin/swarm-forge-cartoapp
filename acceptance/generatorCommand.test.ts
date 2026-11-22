import { describe, expect, it } from 'vitest'

import { planEntryPoints } from './generator'
import { runGenerator, type GeneratorIO } from './generatorCommand'
import { parseFeature } from './ir'

const IR = {
  name: 'Base map',
  scenarios: [{ name: 'Initial view', steps: [{ keyword: 'Then', text: 'the zoom is 5' }], examples: [] }],
}

function fakeIO(files: Readonly<Record<string, string>>) {
  const written = new Map<string, string>()
  const errors: string[] = []
  const io: GeneratorIO = {
    readText(path) {
      const content = files[path]
      if (content === undefined) throw new Error(`ENOENT: no such file, open '${path}'`)
      return content
    },
    writeText(path, content) {
      if (path.startsWith('/read-only/')) throw new Error(`EACCES: permission denied, open '${path}'`)
      written.set(path, content)
    },
    reportError(message) {
      errors.push(message)
    },
  }
  return { io, written, errors }
}

const USAGE = 'usage: acceptance-entrypoint-generator <json-ir> <generated-test-output>'

describe('runGenerator', () => {
  it('writes the entry point and the metadata planned for the IR, and succeeds', () => {
    const { io, written, errors } = fakeIO({ 'build/acceptance/base-map.json': JSON.stringify(IR) })

    const status = runGenerator(['build/acceptance/base-map.json', 'acceptance/generated'], io)

    const { entryPoint, metadata } = planEntryPoints(
      parseFeature(IR),
      'build/acceptance/base-map.json',
      'acceptance/generated',
    )
    expect(status).toBe(0)
    expect(written).toEqual(
      new Map([
        [entryPoint.path, entryPoint.content],
        [metadata.path, metadata.content],
      ]),
    )
    expect(errors).toEqual([])
  })

  it.each([[[]], [['build/acceptance/base-map.json']], [['a.json', 'out', 'extra']]])(
    'reports the usage and exits with 2 for the arguments %j',
    (args) => {
      const { io, written, errors } = fakeIO({})

      expect(runGenerator(args, io)).toBe(2)
      expect(errors).toEqual([USAGE])
      expect(written.size).toBe(0)
    },
  )

  it.each([
    ['a missing IR file', {}, 'out', "ENOENT: no such file, open 'ir.json'"],
    ['an IR that is not JSON', { 'ir.json': '{ name:' }, 'out', 'ir.json: '],
    ['a malformed IR', { 'ir.json': '{"name": "Base map"}' }, 'out', 'Malformed feature IR: feature.scenarios'],
    ['an unwritable output', { 'ir.json': JSON.stringify(IR) }, '/read-only/out', 'EACCES: permission denied'],
  ])('reports %s and exits with 1', (_case, files, outDir, message) => {
    const { io, errors } = fakeIO(files)

    expect(runGenerator(['ir.json', outDir], io)).toBe(1)
    expect(errors).toEqual([expect.stringContaining(message)])
  })
})
