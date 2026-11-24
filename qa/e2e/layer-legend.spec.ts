import { expect, test } from '@playwright/test'

import { expectShown, openLayers, type LayerEntry } from './layers'
import { boxOf } from './mapScreen'
import {
  declaredLegendUrl,
  documentBut,
  LAYERS,
  LEGEND_SIZE,
  legendBut,
  overHttps,
  requestsOf,
  without,
} from './wms'

// Executable form of qa/procedures/layer-legend.md.

/** Expects `shown`, the unfolded legend, to lie under the layer's controls. */
async function expectUnderControls(layer: LayerEntry, shown: typeof layer.legendImage): Promise<void> {
  const controls = await boxOf(layer.legendButton)
  const legend = await boxOf(shown)
  expect(legend.y, 'the legend lies under the controls').toBeGreaterThanOrEqual(controls.y + controls.height)
  const group = await boxOf(layer.group)
  expect(legend.y + legend.height, 'the legend lies in the layer').toBeLessThanOrEqual(group.y + group.height)
}

test('layer-legend 1: every legend is folded when the application starts', async ({ page }) => {
  const { panel } = await openLayers(page)

  for (const layer of LAYERS) {
    await expect(panel.at(layer.position).legendButton).toHaveAttribute('aria-expanded', 'false')
  }
  await expect(page.getByRole('img', { name: /^Légende de / })).toHaveCount(0)
})

test.describe('layer-legend 2: the legend button unfolds the legend image the server declares', () => {
  for (const layer of LAYERS) {
    test(layer.title, async ({ page }) => {
      const { panel, wms } = await openLayers(page)
      const entry = panel.at(layer.position)

      await entry.legendButton.click()

      await expect(entry.legendButton).toHaveAttribute('aria-expanded', 'true')
      await expect(entry.legendImage).toBeVisible()
      await expect.poll(async () => boxOf(entry.legendImage)).toMatchObject(LEGEND_SIZE)
      await expectUnderControls(entry, entry.legendImage)

      const declared = declaredLegendUrl(layer.capabilities, layer.name)
      expect(requestsOf(wms.requests, 'legend', layer.position).map(({ url }) => url.href)).toEqual([overHttps(declared)])
      expect(wms.requests.filter(({ url }) => url.protocol === 'http:').map(({ url }) => url.href)).toEqual([])

      await expectShown(entry, layer.title, false)
    })
  }
})

test('layer-legend 3: the legend button folds the legend again', async ({ page }) => {
  const { panel } = await openLayers(page)
  const litho = panel.at(2)
  await litho.legendButton.click()
  await expect(litho.legendImage).toBeVisible()

  await litho.legendButton.click()

  await expect(litho.legendButton).toHaveAttribute('aria-expanded', 'false')
  await expect(litho.legendImage).toHaveCount(0)
})

test('layer-legend 4: a legend image that does not load is unavailable', async ({ page }) => {
  const { panel } = await openLayers(page, { legend: legendBut(1, { kind: 'empty', status: 404 }) })
  const corine = panel.at(1)

  await corine.legendButton.click()

  await expect(corine.legendMessage).toBeVisible()
  await expectUnderControls(corine, corine.legendMessage)
  await expect(corine.group.getByRole('img')).toHaveCount(0)
})

test('layer-legend 5: a layer without a declared legend has its legend unavailable', async ({ page }) => {
  const { panel, wms } = await openLayers(page, { capabilities: documentBut(2, (document) => without(document, 'LegendURL')) })
  const litho = panel.at(2)

  await litho.legendButton.click()

  await expect(litho.legendMessage).toBeVisible()
  await expectUnderControls(litho, litho.legendMessage)
  await expect(litho.group.getByRole('img')).toHaveCount(0)
  const brgmRequests = wms.requests.filter(({ position, kind }) => position === 2 && kind !== 'capabilities')
  expect(brgmRequests.map(({ url }) => url.href)).toEqual([])
})
