import { describe, expect, it } from 'vitest'

import { httpsUrl, wmsTileUrl } from './wmsTiles'

/** The parameters of a tile URL, by their names in upper case. */
function parameters(tileUrl: string): Readonly<Record<string, string>> {
  const entries = [...new URL(tileUrl).searchParams].map(([name, value]) => [name.toUpperCase(), value])
  return Object.fromEntries(entries)
}

const GETMAP_PARAMETERS = {
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  VERSION: '1.3.0',
  STYLES: '',
  CRS: 'EPSG:3857',
  WIDTH: '256',
  HEIGHT: '256',
  FORMAT: 'image/png',
  TRANSPARENT: 'TRUE',
  BBOX: '{bbox-epsg-3857}',
}

describe('httpsUrl', () => {
  it('asks over HTTPS what is announced over http', () => {
    expect(httpsUrl('http://geoservices.brgm.fr/geologie?layer=LITHO_1M_SIMPLIFIEE&format=image/png')).toBe(
      'https://geoservices.brgm.fr/geologie?layer=LITHO_1M_SIMPLIFIEE&format=image/png',
    )
    expect(httpsUrl('HTTP://geoservices.brgm.fr/geologie')).toBe('https://geoservices.brgm.fr/geologie')
  })

  it('keeps an HTTPS URL as it is', () => {
    expect(httpsUrl('https://data.geopf.fr/annexes/legend.png')).toBe('https://data.geopf.fr/annexes/legend.png')
  })

  it('changes nothing but the scheme', () => {
    expect(httpsUrl('https://example.org/a?u=http://b')).toBe('https://example.org/a?u=http://b')
  })
})

describe('wmsTileUrl', () => {
  it('asks the announced GetMap service for transparent 256-pixel PNG tiles of the layer in EPSG:3857', () => {
    const tileUrl = wmsTileUrl('https://data.geopf.fr/wms-r?', 'LANDCOVER.CLC18_FR')
    const url = new URL(tileUrl)
    expect(url.origin + url.pathname).toBe('https://data.geopf.fr/wms-r')
    expect(parameters(tileUrl)).toEqual({ ...GETMAP_PARAMETERS, LAYERS: 'LANDCOVER.CLC18_FR' })
  })

  it('leaves the bounds of each tile for the map to fill in, written as is', () => {
    expect(wmsTileUrl('https://data.geopf.fr/wms-r?', 'LANDCOVER.CLC18_FR')).toMatch(/&BBOX=\{bbox-epsg-3857\}$/)
  })

  it('asks over HTTPS a service announced over http', () => {
    expect(wmsTileUrl('http://geoservices.brgm.fr/geologie?', 'LITHO_1M_SIMPLIFIEE')).toMatch(
      /^https:\/\/geoservices\.brgm\.fr\/geologie\?/,
    )
  })

  it('keeps the parameters of the announced URL', () => {
    const tileUrl = wmsTileUrl('https://wms.geo.admin.ch/?lang=fr', 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung')
    expect(new URL(tileUrl).pathname).toBe('/')
    expect(parameters(tileUrl)).toEqual({
      ...GETMAP_PARAMETERS,
      LANG: 'fr',
      LAYERS: 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung',
    })
  })

  it('replaces an announced GetMap parameter, whatever its letter case, instead of repeating it', () => {
    const tileUrl = wmsTileUrl('https://example.org/wms?service=WMS&Version=1.1.1&bbox=1,2,3,4&map=parcs', 'parcs')
    expect(parameters(tileUrl)).toEqual({ ...GETMAP_PARAMETERS, MAP: 'parcs', LAYERS: 'parcs' })
    expect(tileUrl.match(/bbox=/gi)).toHaveLength(1)
  })
})
