import { expect, test } from '@playwright/test'

import { CARTO_CREDITS, ESRI_CREDITS } from './basemaps'
import { expectGetMapOf, openLayers, showLayers } from './layers'
import type { MapScreen } from './mapScreen'
import { escapeRegExp } from './tiles'
import { documentBut, layerAt, LAYERS, without } from './wms'

// Executable form of qa/procedures/layer-attribution.md.

/**
 * "The credits read A, then B": they show `credits`, in this order, as the map
 * separates its credits (a comma or a bar), and nothing else.
 */
async function expectCreditsRead(screen: MapScreen, credits: readonly string[]): Promise<void> {
  const separator = '\\s*[,|]\\s*'
  await expect(screen.credits).toHaveText(new RegExp(`^\\s*${credits.map(escapeRegExp).join(separator)}\\s*$`))
}

test.describe('layer-attribution 1: a shown layer adds the credit its server declares', () => {
  for (const layer of LAYERS) {
    test(layer.title, async ({ page }) => {
      const { screen, panel } = await openLayers(page)
      await expectCreditsRead(screen, [CARTO_CREDITS])

      await showLayers(panel, layer.position)

      await expectCreditsRead(screen, [CARTO_CREDITS, layer.credit])
    })
  }
})

test('layer-attribution 2: the credits of the layers follow the order of the list', async ({ page }) => {
  const { screen, panel } = await openLayers(page)

  await showLayers(panel, 3, 1)

  await expectCreditsRead(screen, [CARTO_CREDITS, layerAt(1).credit, layerAt(3).credit])
})

test('layer-attribution 3: hiding a layer removes its credit', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  await showLayers(panel, 1, 2)

  await panel.at(1).eye.click()
  await expectCreditsRead(screen, [CARTO_CREDITS, layerAt(2).credit])

  await panel.at(2).eye.click()
  await expectCreditsRead(screen, [CARTO_CREDITS])
})

test('layer-attribution 4: the credits follow the chosen basemap', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  await showLayers(panel, 2)

  await screen.basemap('World Imagery').click()

  await expectCreditsRead(screen, [ESRI_CREDITS, layerAt(2).credit])
})

test('layer-attribution 5: a layer whose server declares no credit adds none', async ({ page }) => {
  const { screen, panel, wms } = await openLayers(page, {
    capabilities: documentBut(2, (document) => without(document, 'Attribution')),
  })

  await showLayers(panel, 2)
  await expectGetMapOf(wms, 2)

  await expectCreditsRead(screen, [CARTO_CREDITS])
})
