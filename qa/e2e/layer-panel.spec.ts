import { expect, test, type Locator } from '@playwright/test'

import {
  expectControlsEnabled,
  expectGetMapOf,
  expectOpacity,
  expectShown,
  LOADING,
  openLayers,
  UNAVAILABLE,
  type LayerEntry,
  type LayerPanel,
} from './layers'
import { boxOf, overlaps, steadyText, tabUntilFocused } from './mapScreen'
import {
  capabilitiesBut,
  documentBut,
  layerAt,
  LAYERS,
  requestsOf,
  retitled,
  SERVICE_EXCEPTION,
  withoutLayer,
  type LayerAnswer,
  type Position,
} from './wms'

// Executable form of qa/procedures/layer-panel.md.

const TITLES = LAYERS.map((layer) => layer.title)

/** Expects the panel to list the layers as `listedAs`, in this order, each under that name. */
async function expectListedAs(panel: LayerPanel, listedAs: readonly string[]): Promise<void> {
  await expect(panel.layers).toHaveCount(listedAs.length)
  for (const [index, name] of listedAs.entries()) {
    await expect(panel.layers.nth(index)).toHaveAccessibleName(name)
    await expect(panel.layers.nth(index).getByText(name, { exact: true })).toBeVisible()
  }
}

/** Expects `layer` to read `status` under its name. */
async function expectStatus(layer: LayerEntry, status: string, timeout?: number): Promise<void> {
  await expect(layer.group.getByText(status, { exact: true })).toBeVisible({ timeout })
}

/** Expects the layer at `position` to be listed under its WMS name, to read `status`, and to have its controls disabled. */
async function expectUnusable(panel: LayerPanel, position: Position, status: string, timeout?: number): Promise<void> {
  const { name } = layerAt(position)
  await expect(panel.layers.nth(position - 1)).toHaveAccessibleName(name, { timeout })
  await expectStatus(panel.layer(name), status, timeout)
  await expectControlsEnabled(panel.layer(name), false)
}

test('layer-panel 1: the panel lists three layers', async ({ page }) => {
  const { screen, panel } = await openLayers(page)

  const region = await boxOf(panel.region)
  const map = await boxOf(screen.map)
  // The compass is the third button: MapLibre names it by what it does.
  const zoomButtons = ['Zoom in', 'Zoom out', 'Drag to rotate map, click to reset north'].map((name) =>
    page.getByRole('button', { name, exact: true }),
  )
  expect(region.x, 'the panel lies on the right of the map').toBeGreaterThan(map.x + map.width / 2)
  expect(region.x + region.width, 'the panel lies on the map').toBeLessThanOrEqual(map.x + map.width)
  for (const button of zoomButtons) {
    const box = await boxOf(button)
    expect(region.y, 'the panel lies under the zoom buttons').toBeGreaterThanOrEqual(box.y + box.height)
  }
  const uncovered: readonly Locator[] = [...zoomButtons, screen.credits, screen.viewIndicator, screen.panel]
  for (const other of uncovered) {
    expect(overlaps(region, await boxOf(other)), `the panel covers ${other.toString()}`).toBe(false)
  }

  await expect(panel.layers).toHaveCount(3)
})

test('layer-panel 2: each layer is listed under the title its server declares, in a fixed order', async ({
  page,
  context,
}) => {
  const { panel } = await openLayers(page)

  await expectListedAs(panel, TITLES)

  const recordedTitle = 'Lithologie (titre enregistré)'
  const retitledPage = await context.newPage()
  const opened = await openLayers(retitledPage, {
    capabilities: documentBut(2, (document) => retitled(document, layerAt(2).title, recordedTitle)),
  })

  await expect(opened.panel.layers.nth(1)).toHaveAccessibleName(recordedTitle)
  await expect(opened.panel.layer(recordedTitle).eye).toHaveAccessibleName(`Afficher ${recordedTitle}`)
})

test('layer-panel 3: the application asks every server for its capabilities at once', async ({ page }) => {
  const { panel, wms } = await openLayers(page, { held: [1, 2, 3] })

  for (const layer of LAYERS) {
    await expect.poll(() => requestsOf(wms.requests, 'capabilities', layer.position).length).toBe(1)
    const [request] = requestsOf(wms.requests, 'capabilities', layer.position)
    expect(request?.url.href.startsWith(layer.serverUrl), `${request?.url.href} asks ${layer.serverUrl}`).toBe(true)
  }

  wms.letThrough(1, 2, 3)

  await expectListedAs(panel, TITLES)
})

test('layer-panel 4: a layer reads "Chargement…" until its server answers', async ({ page }) => {
  const { panel, wms } = await openLayers(page, { held: [2] })

  await expectUnusable(panel, 2, LOADING)

  await expectControlsEnabled(panel.at(1), true)
  await expectControlsEnabled(panel.at(3), true)
  await panel.region.getByRole('button', { name: `Afficher ${layerAt(1).title}`, exact: true }).click()
  await expectShown(panel.at(1), layerAt(1).title, true)
  await expectGetMapOf(wms, 1)

  wms.letThrough(2)

  await expect(panel.layers.nth(1)).toHaveAccessibleName(layerAt(2).title)
  await expect(panel.at(2).group.getByText(LOADING)).toHaveCount(0)
  await expectControlsEnabled(panel.at(2), true)
})

interface UnavailableRow {
  readonly name: string
  readonly position: Position
  readonly answer: LayerAnswer
}

const UNAVAILABLE_ROWS: readonly UnavailableRow[] = [
  { name: 'layer 1: the connection is aborted', position: 1, answer: () => ({ kind: 'aborted' }) },
  { name: 'layer 2: HTTP 500', position: 2, answer: () => ({ kind: 'empty', status: 500 }) },
  {
    name: 'layer 2: a ServiceExceptionReport',
    position: 2,
    answer: () => ({ kind: 'document', body: SERVICE_EXCEPTION }),
  },
  {
    name: 'layer 3: the capabilities without its layer',
    position: 3,
    answer: (layer) => ({ kind: 'document', body: withoutLayer(layer.capabilities, layer.name) }),
  },
]

test.describe('layer-panel 5: a layer its server cannot give is unavailable, and the other layers stay usable', () => {
  for (const row of UNAVAILABLE_ROWS) {
    test(row.name, async ({ page }) => {
      const { panel, wms } = await openLayers(page, { capabilities: capabilitiesBut(row.position, row.answer) })

      await expectUnusable(panel, row.position, UNAVAILABLE)

      const others = LAYERS.filter((layer) => layer.position !== row.position)
      for (const other of others) await expectControlsEnabled(panel.at(other.position), true)
      const [shown] = others
      if (shown === undefined) throw new Error('No other layer.')
      await panel.at(shown.position).eye.click()
      await expectGetMapOf(wms, shown.position)
    })
  }
})

test('layer-panel 6: a layer whose server has not answered within 30 seconds is unavailable', async ({ page }) => {
  test.setTimeout(60_000)
  const startedAt = Date.now()
  const { panel, wms } = await openLayers(page, { held: [3] })
  const waitUntil = (seconds: number): Promise<void> => page.waitForTimeout(startedAt + seconds * 1000 - Date.now())

  await waitUntil(25)
  await expectStatus(panel.layer(layerAt(3).name), LOADING, 500)

  await waitUntil(32)
  await expectUnusable(panel, 3, UNAVAILABLE, 500)

  wms.letThrough(3)
  await page.waitForTimeout(2000)
  await expectUnusable(panel, 3, UNAVAILABLE)

  await expectControlsEnabled(panel.at(1), true)
  await expectControlsEnabled(panel.at(2), true)
})

/** Expects `control` to have the focus and to show it. */
async function expectFocusMark(control: Locator): Promise<void> {
  await expect(control).toBeFocused()
  await expect(control).not.toHaveCSS('outline-style', 'none')
  await expect(control).not.toHaveCSS('outline-width', '0px')
}

test('layer-panel 7: the panel can be used with the keyboard alone', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  await expectControlsEnabled(panel.at(3), true)
  const first = panel.at(1)

  await tabUntilFocused(page, first.eye)
  const tabOrder = LAYERS.flatMap((layer) => panel.at(layer.position).controls)
  for (const [index, control] of tabOrder.entries()) {
    if (index > 0) await page.keyboard.press('Tab')
    await expectFocusMark(control)
  }

  await first.eye.focus()
  await page.keyboard.press('Space')
  await expectShown(first, layerAt(1).title, true)
  await page.keyboard.press('Enter')
  await expectShown(first, layerAt(1).title, false)

  await first.slider.focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expectOpacity(first, '90 %')

  await first.legendButton.focus()
  await page.keyboard.press('Enter')
  await expect(first.legendButton).toHaveAttribute('aria-expanded', 'true')
  await expect(first.legendImage).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(first.legendButton).toHaveAttribute('aria-expanded', 'false')
  await expect(first.legendImage).toHaveCount(0)

  const view = await steadyText(screen.viewIndicator)
  await panel.at(3).zoom.focus()
  await page.keyboard.press('Enter')
  await expect(screen.viewIndicator).not.toHaveText(view)
})
