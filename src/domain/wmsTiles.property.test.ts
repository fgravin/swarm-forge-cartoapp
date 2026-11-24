import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { httpsUrl, WMS_TILE_SIZE, wmsTileUrl } from './wmsTiles'

const TILE_BOUNDS = '{bbox-epsg-3857}'

/** What every tile URL asks, by parameter name in upper case. */
const GETMAP = {
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  VERSION: '1.3.0',
  STYLES: '',
  CRS: 'EPSG:3857',
  WIDTH: String(WMS_TILE_SIZE),
  HEIGHT: String(WMS_TILE_SIZE),
  FORMAT: 'image/png',
  TRANSPARENT: 'TRUE',
} as const

// Any text, with the characters a URL gives a meaning to.
const texts = fc.string({
  unit: fc.oneof(fc.constantFrom('&', '=', '+', '#', '%', '?', '/', ' ', '{', '}', 'é'), fc.string({ unit: 'grapheme', minLength: 1, maxLength: 1 })),
  maxLength: 12,
})

// The GetMap parameters a server may already announce, in any letter case, and parameters of its own.
const parameterNames = fc.oneof(
  fc.constantFrom('service', 'Request', 'VERSION', 'styles', 'crs', 'srs', 'width', 'Height', 'format', 'transparent', 'layers', 'bbox', 'BBOX'),
  fc.constantFrom('map', 'lang', 'token'),
  fc.string({ unit: fc.constantFrom('a', 'b', 'x'), minLength: 1, maxLength: 3 }),
)

const announcedUrls = fc
  .record({
    scheme: fc.constantFrom('http', 'https', 'HTTP'),
    host: fc.domain(),
    path: fc.constantFrom('', '/', '/wms', '/wms-r/wms', '/geologie'),
    parameters: fc.array(fc.tuple(parameterNames, texts), { maxLength: 5 }),
  })
  .map(({ scheme, host, path, parameters }) => {
    const query = new URLSearchParams(parameters).toString()
    return { url: `${scheme}://${host}${path}?${query}`, parameters }
  })

const GETMAP_NAMES = new Set([...Object.keys(GETMAP), 'LAYERS', 'BBOX'])

/** The parameters of `url`, with their names in upper case, in their order. */
function parametersOf(url: URL): readonly (readonly [string, string])[] {
  return [...url.searchParams].map(([name, value]) => [name.toUpperCase(), value] as const)
}

describe('wmsTileUrl', () => {
  it('asks the announced service over HTTPS for the layer, each GetMap parameter once, keeping the parameters of its own', () => {
    fc.assert(
      fc.property(announcedUrls, texts, ({ url, parameters }, layerName) => {
        const tileUrl = wmsTileUrl(url, layerName)

        expect(tileUrl.endsWith(`&BBOX=${TILE_BOUNDS}`)).toBe(true)
        expect(tileUrl.split(TILE_BOUNDS)).toHaveLength(2)
        const tile = new URL(tileUrl.slice(0, -`&BBOX=${TILE_BOUNDS}`.length))
        const announced = new URL(url)
        expect(tile.protocol).toBe('https:')
        expect(`${tile.host}${tile.pathname}`).toBe(`${announced.host}${announced.pathname}`)

        const asked = parametersOf(tile)
        expect(Object.fromEntries(asked.filter(([name]) => GETMAP_NAMES.has(name)))).toEqual({ ...GETMAP, LAYERS: layerName })
        expect(asked.filter(([name]) => GETMAP_NAMES.has(name))).toHaveLength(Object.keys(GETMAP).length + 1)
        const own = parameters.filter(([name]) => !GETMAP_NAMES.has(name.toUpperCase()))
        expect(asked.filter(([name]) => !GETMAP_NAMES.has(name))).toEqual(own.map(([name, value]) => [name.toUpperCase(), value]))
      }),
    )
  })
})

describe('httpsUrl', () => {
  // URLs, some of which name another URL in their query.
  const urls = fc.oneof(
    fc.webUrl({ withQueryParameters: true, withFragments: true }),
    fc
      .record({ scheme: fc.constantFrom('http', 'https', 'HTTP'), host: fc.domain(), rest: fc.constantFrom('/a?u=http://b.example/c', '/legend.png?url=HTTP://d.example') })
      .map(({ scheme, host, rest }) => `${scheme}://${host}${rest}`),
  )

  it('asks over HTTPS what is announced over http, changes nothing else, and changes nothing twice', () => {
    fc.assert(
      fc.property(urls, (url) => {
        const secure = httpsUrl(url)

        expect(secure.toLowerCase().startsWith('http://')).toBe(false)
        expect(secure.replace(/^https:\/\//, '')).toBe(url.replace(/^https?:\/\//i, ''))
        expect(httpsUrl(secure)).toBe(secure)
      }),
    )
  })
})
