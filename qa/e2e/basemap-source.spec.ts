import { expect, test } from '@playwright/test'

import { BASEMAP_NAMES, BASEMAP_TILES, CARTO_CREDITS, ESRI_CREDITS, type BasemapName } from './basemaps'
import {
  basemapTiles,
  expectCentreTilesFrom,
  expectCredits,
  mapScreen,
  zoomInAllTheWay,
  zoomInOnce,
} from './mapScreen'
import { serveTilesLocally } from './tiles'

// Executable form of qa/procedures/basemap-source.md.

interface SourceRow {
  readonly firstChoice: BasemapName
  readonly thenChoose: BasemapName
  readonly credits: string
  readonly notCredited: readonly string[]
}

// The table of basemap-source 1. Each row's tile URL and centre tile are those
// of its "Then choose" basemap, in BASEMAP_TILES.
const SOURCE_ROWS: readonly SourceRow[] = [
  { firstChoice: 'World Imagery', thenChoose: 'Positron', credits: CARTO_CREDITS, notCredited: [ESRI_CREDITS] },
  { firstChoice: 'World Topographic Map', thenChoose: 'Dark Matter', credits: CARTO_CREDITS, notCredited: [ESRI_CREDITS] },
  { firstChoice: 'Dark Matter', thenChoose: 'World Imagery', credits: ESRI_CREDITS, notCredited: ['CARTO', 'OpenStreetMap'] },
  { firstChoice: 'Positron', thenChoose: 'World Topographic Map', credits: ESRI_CREDITS, notCredited: ['CARTO', 'OpenStreetMap'] },
]

test.describe('basemap-source 1: the map draws the chosen basemap and credits only its provider', () => {
  for (const row of SOURCE_ROWS) {
    test(`${row.firstChoice}, then ${row.thenChoose}`, async ({ page }) => {
      const requested = await serveTilesLocally(page)
      const screen = mapScreen(page)
      await page.goto('/')

      await screen.basemap(row.firstChoice).click()
      // Let the first choice be drawn, so that step 6 shows it was replaced.
      await expect.poll(() => basemapTiles(row.firstChoice, requested).length).toBeGreaterThan(0)

      let since = requested.length
      await screen.basemap(row.thenChoose).click()

      await expectCentreTilesFrom(row.thenChoose, requested, since)
      await expectCredits(screen, row.credits, row.notCredited)

      since = requested.length
      await zoomInOnce(screen)
      await expect(screen.viewIndicator).toHaveText(/zoom 6\.0$/)
      await expect
        .poll(() => basemapTiles(row.thenChoose, requested.slice(since)).some((tile) => tile.z === 7))
        .toBe(true)
      expect(basemapTiles(row.firstChoice, requested.slice(since))).toEqual([])
    })
  }
})

test.describe('basemap-source 2: every basemap is drawn from tiles of one size up to one zoom level', () => {
  for (const basemap of BASEMAP_NAMES) {
    test(basemap, async ({ page }) => {
      // Up to twenty zoom animations on a software-rendered map.
      test.setTimeout(120_000)
      const requested = await serveTilesLocally(page)
      const screen = mapScreen(page)
      await page.goto('/')

      await screen.basemap(basemap).click()

      const { centreTile } = BASEMAP_TILES[basemap]
      await expect.poll(() => requested.some((url) => url.endsWith(centreTile))).toBe(true)
      expect(basemapTiles(basemap, requested).filter((tile) => tile.z === 5)).toEqual([])

      await zoomInAllTheWay(screen)

      await expect.poll(() => basemapTiles(basemap, requested).some((tile) => tile.z === 19)).toBe(true)
      expect(basemapTiles(basemap, requested).filter((tile) => tile.z > 19)).toEqual([])
    })
  }
})
