import { describe, expect, it } from 'vitest'

import { BASEMAPS, rasterTiles, type RasterTiles } from '../domain/basemaps'
import type { BasemapDisplay } from './mapPort'
import { useBasemaps } from './useBasemaps'

function fakeDisplay() {
  const shown: RasterTiles[] = []
  const display: BasemapDisplay = {
    showBasemap(tiles) {
      shown.push(tiles)
    },
  }
  return { display, shown }
}

describe('useBasemaps', () => {
  it('groups the basemaps by provider, with Positron selected', () => {
    const { groups } = useBasemaps()

    expect(groups.value).toEqual([
      {
        provider: 'CARTO',
        options: [
          { id: 'positron', name: 'Positron', selected: true },
          { id: 'dark-matter', name: 'Dark Matter', selected: false },
        ],
      },
      {
        provider: 'Esri',
        options: [
          { id: 'world-imagery', name: 'World Imagery', selected: false },
          { id: 'world-topographic-map', name: 'World Topographic Map', selected: false },
        ],
      },
    ])
  })

  it('selects the chosen basemap alone', () => {
    const { groups, select } = useBasemaps()

    select('world-imagery')

    const selected = groups.value.flatMap((group) => group.options).filter((option) => option.selected)
    expect(selected.map((option) => option.id)).toEqual(['world-imagery'])
  })

  it('shows the selected basemap on the display it is connected to', () => {
    const { display, shown } = fakeDisplay()
    const { connect } = useBasemaps()

    connect(display)

    expect(shown).toEqual([rasterTiles(BASEMAPS.positron)])
  })

  it('shows each basemap chosen afterwards', () => {
    const { display, shown } = fakeDisplay()
    const { connect, select } = useBasemaps()
    connect(display)

    select('dark-matter')
    select('world-topographic-map')

    expect(shown).toEqual([
      rasterTiles(BASEMAPS.positron),
      rasterTiles(BASEMAPS['dark-matter']),
      rasterTiles(BASEMAPS['world-topographic-map']),
    ])
  })

  it('shows a basemap chosen before the display was connected once it is', () => {
    const { display, shown } = fakeDisplay()
    const { connect, select } = useBasemaps()

    select('world-imagery')
    connect(display)

    expect(shown).toEqual([rasterTiles(BASEMAPS['world-imagery'])])
  })

  it('does not draw the selected basemap again when it is chosen again', () => {
    const { display, shown } = fakeDisplay()
    const { connect, select } = useBasemaps()
    connect(display)

    select('positron')

    expect(shown).toEqual([rasterTiles(BASEMAPS.positron)])
  })

  it('stops showing basemaps on a display once disconnected', () => {
    const { display, shown } = fakeDisplay()
    const { connect, disconnect, select, groups } = useBasemaps()
    connect(display)

    disconnect()
    select('dark-matter')

    expect(shown).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(groups.value[0]?.options[1]?.selected).toBe(true)
  })

  it('shows basemaps only on the display connected last', () => {
    const first = fakeDisplay()
    const second = fakeDisplay()
    const { connect, select } = useBasemaps()
    connect(first.display)
    connect(second.display)

    select('dark-matter')

    expect(first.shown).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(second.shown).toEqual([rasterTiles(BASEMAPS.positron), rasterTiles(BASEMAPS['dark-matter'])])
  })
})
