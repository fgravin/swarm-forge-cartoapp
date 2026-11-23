import { describe, expect, it } from 'vitest'

import { BASEMAP_PROVIDERS, BASEMAPS, INITIAL_BASEMAP } from './basemaps'

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
