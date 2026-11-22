import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { BASEMAP_PROVIDERS } from './basemaps'
import { rasterTiles, tileServerUrls } from './rasterTiles'

const servers = fc.array(fc.stringMatching(/^[a-z0-9]{1,8}$/), { minLength: 2, maxLength: 8 })
const hostTail = fc.stringMatching(/^(\.[a-z0-9]{1,10}){1,3}$/)
const tilePath = fc.constantFrom('/{z}/{x}/{y}.png', '/tile/{z}/{y}/{x}', '/{z}/{x}/{y}@2x.png')
const singleHost = fc.stringMatching(/^[a-z0-9]{1,10}(\.[a-z0-9]{1,10}){1,3}$/)

const BASEMAP_LIST = BASEMAP_PROVIDERS.flatMap((provider) => provider.basemaps)

describe('tileServerUrls', () => {
  it('gives one URL per listed server, in order, each with the server in place of the list', () => {
    fc.assert(
      fc.property(servers, hostTail, tilePath, (names, tail, path) => {
        const template = `https://{${names.join(',')}}${tail}${path}`

        expect(tileServerUrls(template)).toEqual(names.map((name) => `https://${name}${tail}${path}`))
      }),
    )
  })

  it('keeps a URL that lists no servers as it is, whatever its tile placeholders', () => {
    fc.assert(
      fc.property(singleHost, tilePath, (host, path) => {
        const url = `https://${host}${path}`

        expect(tileServerUrls(url)).toEqual([url])
      }),
    )
  })
})

describe('rasterTiles', () => {
  it('draws every basemap from concrete tile URLs, each with one zoom, column, and row placeholder', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BASEMAP_LIST), (basemap) => {
        const { tileUrls, tileSize, maxZoom, attribution } = rasterTiles(basemap)

        expect(tileUrls.length).toBeGreaterThan(0)
        for (const url of tileUrls) {
          expect(url).not.toMatch(/\{[^{}]*,[^{}]*\}/)
          expect(url.match(/\{z\}/g)).toHaveLength(1)
          expect(url.match(/\{x\}/g)).toHaveLength(1)
          expect(url.match(/\{y\}/g)).toHaveLength(1)
        }
        expect({ tileSize, maxZoom, attribution }).toEqual({ tileSize: 256, maxZoom: 19, attribution: basemap.attribution })
      }),
    )
  })
})
