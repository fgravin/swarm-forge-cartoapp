import { describe, expect, it } from 'vitest'

import { BASEMAP_PROVIDERS, BASEMAPS, INITIAL_BASEMAP, rasterTiles, tileServerUrls } from './basemaps'

describe('BASEMAP_PROVIDERS', () => {
  it('offers the CARTO basemaps, then the Esri basemaps', () => {
    const offered = BASEMAP_PROVIDERS.map((provider) => [provider.name, provider.basemaps.map((each) => each.name)])

    expect(offered).toEqual([
      ['CARTO', ['Positron', 'Dark Matter']],
      ['Esri', ['World Imagery', 'World Topographic Map']],
    ])
  })
})

describe('INITIAL_BASEMAP', () => {
  it('is Positron', () => {
    expect(BASEMAPS[INITIAL_BASEMAP].name).toBe('Positron')
  })
})

describe('tileServerUrls', () => {
  it('gives one URL per server letter, in order', () => {
    expect(tileServerUrls('https://{a,b,c,d}.example.com/{z}/{x}/{y}.png')).toEqual([
      'https://a.example.com/{z}/{x}/{y}.png',
      'https://b.example.com/{z}/{x}/{y}.png',
      'https://c.example.com/{z}/{x}/{y}.png',
      'https://d.example.com/{z}/{x}/{y}.png',
    ])
  })

  it('keeps a URL with a single server as it is', () => {
    expect(tileServerUrls('https://tiles.example.com/tile/{z}/{y}/{x}')).toEqual([
      'https://tiles.example.com/tile/{z}/{y}/{x}',
    ])
  })
})

describe('rasterTiles', () => {
  it('draws a CARTO basemap from its four servers and credits OpenStreetMap and CARTO', () => {
    expect(rasterTiles(BASEMAPS['dark-matter'])).toEqual({
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors © CARTO',
    })
  })

  it('draws an Esri basemap from its row-first tile URL and credits Esri', () => {
    expect(rasterTiles(BASEMAPS['world-topographic-map'])).toEqual({
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxZoom: 19,
      attribution: 'Powered by Esri',
    })
  })

  it.each([
    [
      'positron',
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      '© OpenStreetMap contributors © CARTO',
    ],
    [
      'world-imagery',
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      'Powered by Esri',
    ],
  ] as const)('draws %s from its own tiles, with its own credits', (id, firstTileUrl, attribution) => {
    const { tiles, ...rest } = rasterTiles(BASEMAPS[id])

    expect(tiles[0]).toBe(firstTileUrl)
    expect(rest).toEqual({ tileSize: 256, maxZoom: 19, attribution })
  })
})
