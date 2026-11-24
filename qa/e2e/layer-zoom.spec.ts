import { expect, test } from '@playwright/test'

import { expectShownLayers, openLayers, showLayers } from './layers'
import { steadyText } from './mapScreen'
import { expectViewWithin, type ViewRanges } from './view'
import { documentBut, layerAt, requestsOf, without, type Position } from './wms'

// Executable form of qa/procedures/layer-zoom.md.

interface ExtentRow extends ViewRanges {
  readonly position: Position
}

const EXTENT_ROWS: readonly ExtentRow[] = [
  { position: 1, lat: [46.0, 46.6], lng: [0.6, 1.2], zoom: [4.4, 5.0] },
  { position: 2, lat: [46.1, 46.6], lng: [2.4, 2.9], zoom: [4.6, 5.2] },
  { position: 3, lat: [46.5, 46.9], lng: [8.6, 9.0], zoom: [5.5, 6.1] },
]

test.describe('layer-zoom 1: the zoom button shows the extent the server declares for the layer', () => {
  for (const row of EXTENT_ROWS) {
    test(layerAt(row.position).title, async ({ page }) => {
      const { screen, panel } = await openLayers(page)
      const before = await steadyText(screen.viewIndicator)

      await panel.at(row.position).zoom.click()

      await expectViewWithin(screen, before, row)
    })
  }
})

test('layer-zoom 2: the zoom button neither shows nor hides the layer', async ({ page }) => {
  const { screen, panel, wms } = await openLayers(page)
  await showLayers(panel, 1)

  await panel.at(2).zoom.click()
  await steadyText(screen.viewIndicator)

  await expectShownLayers(panel, [1])
  expect(requestsOf(wms.requests, 'getMap', 2)).toHaveLength(0)

  await showLayers(panel, 2)
  await panel.at(2).zoom.click()
  await expectShownLayers(panel, [1, 2])
})

test('layer-zoom 3: the zoom button is disabled when the server declares no extent', async ({ page }) => {
  const withoutExtent = (document: string): string =>
    without(without(document, 'EX_GeographicBoundingBox'), 'BoundingBox')
  const { panel } = await openLayers(page, { capabilities: documentBut(2, withoutExtent) })
  const brgm = panel.at(2)

  await expect(brgm.zoom).toBeDisabled()
  for (const control of [brgm.eye, brgm.slider, brgm.legendButton]) await expect(control).toBeEnabled()
  await expect(panel.at(1).zoom).toBeEnabled()
  await expect(panel.at(3).zoom).toBeEnabled()
})
