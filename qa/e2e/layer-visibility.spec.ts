import { expect, test } from '@playwright/test'

import { drawBbox } from './bbox'
import { answerGeoNames, GRENOBLE_VIEW, USUAL_ANSWERS } from './geonames'
import {
  expectColourAtC,
  expectGetMapOf,
  expectMixAtC,
  expectOpacity,
  expectShown,
  expectShownLayers,
  openLayers,
  sameColour,
  showLayers,
} from './layers'
import { basemapTiles } from './mapScreen'
import { colourAt, expectMapLooksLike, takeSettledMapPicture, type MapPicture } from './pictures'
import type { Colour } from './png'
import { dragOnMap, mapCentre, offset } from './pointer'
import { searchBox, searchFor } from './searchBox'
import { expectViewReads } from './view'
import { BLUE, GREEN, layerAt, LAYERS, parameter, RED, requestsOf, type Position, type WmsLayer } from './wms'

// Executable form of qa/procedures/layer-visibility.md.

test('layer-visibility 1: every layer is hidden when the application starts', async ({ page }) => {
  const { panel, wms } = await openLayers(page)

  for (const layer of LAYERS) {
    await expect(panel.region.getByRole('button', { name: `Afficher ${layer.title}`, exact: true })).toBeVisible()
    await expectShown(panel.at(layer.position), layer.title, false)
  }

  await page.waitForTimeout(2000)
  expect(requestsOf(wms.requests, 'getMap')).toHaveLength(0)
})

test.describe('layer-visibility 2: the eye button shows the layer', () => {
  for (const layer of LAYERS) {
    test(layer.title, async ({ page }) => {
      const { screen, panel, wms } = await openLayers(page)
      const c = await mapCentre(screen)

      await panel.region.getByRole('button', { name: `Afficher ${layer.title}`, exact: true }).click()

      await expectShown(panel.at(layer.position), layer.title, true)
      await expectGetMapOf(wms, layer.position)
      await expectColourAtC(page, c, layer.colour)
    })
  }
})

test('layer-visibility 3: the eye button hides the layer again', async ({ page }) => {
  const { screen, panel, wms } = await openLayers(page)
  const c = await mapCentre(screen)
  const picture = await takeSettledMapPicture(page, c)
  const { title } = layerAt(2)

  await panel.region.getByRole('button', { name: `Afficher ${title}`, exact: true }).click()
  await expectColourAtC(page, c, RED)
  await panel.region.getByRole('button', { name: `Masquer ${title}`, exact: true }).click()

  await expectShown(panel.at(2), title, false)
  await expectMapLooksLike(page, picture)

  const getMaps = requestsOf(wms.requests, 'getMap').length
  await dragOnMap(page, c, offset(c, 200, 0))
  await takeSettledMapPicture(page, c)
  expect(requestsOf(wms.requests, 'getMap')).toHaveLength(getMaps)
})

interface StackRow {
  readonly shown: readonly Position[]
  readonly onTop: Colour
  readonly next: Colour
}

const STACK_ROWS: readonly StackRow[] = [
  { shown: [3, 1], onTop: BLUE, next: GREEN },
  { shown: [3, 2], onTop: RED, next: GREEN },
  { shown: [2, 3, 1], onTop: BLUE, next: RED },
]

test.describe('layer-visibility 4: the first layer of the list is drawn on top', () => {
  for (const row of STACK_ROWS) {
    test(`shown ${row.shown.join(', ')}`, async ({ page }) => {
      const { screen, panel } = await openLayers(page)
      const c = await mapCentre(screen)

      await showLayers(panel, ...row.shown)
      await expectColourAtC(page, c, row.onTop)

      const [top] = [...row.shown].sort((a, b) => a - b)
      if (top === undefined) throw new Error('No layer shown.')
      await panel.region.getByRole('button', { name: `Masquer ${layerAt(top).title}`, exact: true }).click()
      await expectColourAtC(page, c, row.next)
    })
  }
})

test('layer-visibility 5: changing the basemap keeps the layers as they were', async ({ page }) => {
  const { screen, panel, requested } = await openLayers(page)
  const c = await mapCentre(screen)
  const basemap = colourAt(await takeSettledMapPicture(page, c))
  await showLayers(panel, 3, 1)

  await panel.at(3).slider.focus()
  for (let pressed = 0; pressed < 12; pressed++) await page.keyboard.press('ArrowLeft')
  await expectOpacity(panel.at(3), '40 %')

  const since = requested.length
  await screen.basemap('Dark Matter').click()
  await expect.poll(() => basemapTiles('Dark Matter', requested.slice(since)).length).toBeGreaterThan(0)

  await expectShownLayers(panel, [1, 3])
  await expectOpacity(panel.at(3), '40 %')
  await expectColourAtC(page, c, BLUE)

  await panel.at(1).eye.click()
  await expectMixAtC(page, c, GREEN, basemap)
})

const NUMBER = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i

/** Expects `url` to be a GetMap request of `layer`'s tiles, as the procedure lists its parameters. */
function expectGetMapTile(url: URL, layer: WmsLayer): void {
  const expected: Readonly<Record<string, string>> = {
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: layer.name,
    STYLES: '',
    CRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE',
  }
  for (const [name, value] of Object.entries(expected)) expect(parameter(url, name), `${name} of ${url.href}`).toBe(value)
  const bounds = parameter(url, 'BBOX')?.split(',') ?? []
  expect(bounds, `BBOX of ${url.href}`).toHaveLength(4)
  for (const bound of bounds) expect(bound, `BBOX of ${url.href}`).toMatch(NUMBER)
  for (const placeholder of ['bbox-epsg-3857', '{', '%7b']) expect(url.href.toLowerCase()).not.toContain(placeholder)
}

/**
 * Where the tiles of each layer are asked: its server over HTTPS. geo.admin.ch
 * announces its GetMap service at https://wms.geo.admin.ch/fr/, French by its
 * path, where the procedure expects `lang=fr` (see the QA clarification of
 * layer-visibility 6): the tiles are asked where the server announces them.
 */
const TILE_SERVICES: Readonly<Record<Position, string>> = {
  1: 'https://data.geopf.fr/wms-r/wms',
  2: 'https://geoservices.brgm.fr/geologie',
  3: 'https://wms.geo.admin.ch/fr/',
}

test.describe('layer-visibility 6: a shown layer is drawn from transparent GetMap tiles, over HTTPS', () => {
  for (const layer of LAYERS) {
    test(layer.title, async ({ page }) => {
      const { panel, wms } = await openLayers(page)

      await showLayers(panel, layer.position)
      await expectGetMapOf(wms, layer.position)

      for (const { url } of requestsOf(wms.requests, 'getMap', layer.position)) {
        expect(`${url.origin}${url.pathname}`, url.href).toBe(TILE_SERVICES[layer.position])
        expectGetMapTile(url, layer)
      }
      expect(wms.requests.filter(({ url }) => url.protocol === 'http:').map(({ url }) => url.href)).toEqual([])
    })
  }
})

test('layer-visibility 7: choosing a place found by the search keeps the layers', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  await answerGeoNames(page, USUAL_ANSWERS)
  const search = searchBox(page)
  const c = await mapCentre(screen)
  await showLayers(panel, 3, 1)

  await searchFor(page, search, 'Gre')
  await search.option('Grenoble').click()

  await expectViewReads(screen, GRENOBLE_VIEW)
  await expectShownLayers(panel, [1, 3])
  await expectColourAtC(page, c, BLUE)
})

// The bbox rectangle of the procedure, C-(100,100) to C+(100,100), and points along its edges.
const HALF_SIDE = 100
const ALONG = [-60, -30, 0, 30, 60]
const EDGE_POINTS = ALONG.flatMap((t) => [
  { dx: t, dy: -HALF_SIDE, across: 'dy' },
  { dx: t, dy: HALF_SIDE, across: 'dy' },
  { dx: -HALF_SIDE, dy: t, across: 'dx' },
  { dx: HALF_SIDE, dy: t, across: 'dx' },
] as const)
const OUTLINE: Colour = [3, 105, 161]
// How far from the edge the outline's pixels lie, its antialiasing included.
const ACROSS = [-3, -2, -1, 0, 1, 2, 3]

function distance(a: Colour, b: Colour): number {
  return Math.max(...a.map((level, channel) => Math.abs(level - (b[channel] ?? NaN))))
}

/** The pixel of the outline nearest each edge point: the one whose colour is closest to the outline's. */
function outlinePixels(picture: MapPicture): readonly { readonly dx: number; readonly dy: number }[] {
  return EDGE_POINTS.map(({ dx, dy, across }) => {
    const candidates = ACROSS.map((step) => (across === 'dx' ? { dx: dx + step, dy } : { dx, dy: dy + step }))
    const scored = candidates.map((point) => ({ point, off: distance(colourAt(picture, point.dx, point.dy), OUTLINE) }))
    const [best] = scored.sort((a, b) => a.off - b.off)
    if (best === undefined || best.off > 40) throw new Error(`No outline near ${dx}, ${dy}.`)
    return best.point
  })
}

test('layer-visibility 8: the layers are drawn under the bbox rectangle', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  const c = await mapCentre(screen)
  await drawBbox(page, screen, offset(c, -HALF_SIDE, -HALF_SIDE), offset(c, HALF_SIDE, HALF_SIDE))
  const drawn = await takeSettledMapPicture(page, c)

  await showLayers(panel, 1)
  await expectColourAtC(page, c, BLUE)

  await expect(async () => {
    const withLayer = await takeSettledMapPicture(page, c)
    for (const { dx, dy } of outlinePixels(drawn)) {
      expect(distance(colourAt(withLayer, dx, dy), colourAt(drawn, dx, dy)), `the outline at ${dx}, ${dy}`).toBeLessThanOrEqual(
        12,
      )
    }
    for (const [dx, dy] of [
      [250, 0],
      [-250, 0],
      [0, 250],
      [0, -250],
    ] as const) {
      expect(sameColour(colourAt(withLayer, dx, dy), BLUE), `the map at ${dx}, ${dy}`).toBe(true)
    }
  }).toPass({ timeout: 10_000 })
})
