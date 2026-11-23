import { expect, test, type Locator } from '@playwright/test'

import { boxOf, liesInside, mapScreen, overlaps } from './mapScreen'
import { serveTilesLocally } from './tiles'

// Executable form of qa/procedures/basemap-panel.md.

/** Expects `locator` to find exactly the elements named `names`, in this order. */
async function expectNamesInOrder(locator: Locator, names: readonly string[]): Promise<void> {
  await expect(locator).toHaveCount(names.length)
  for (const [index, name] of names.entries()) await expect(locator.nth(index)).toHaveAccessibleName(name)
}

test('basemap-panel 1: the panel offers each basemap under its provider', async ({ page }) => {
  await serveTilesLocally(page)
  const screen = mapScreen(page)
  await page.goto('/')

  await expect(screen.panel).toBeVisible()
  await expect(screen.panel.getByText('Fonds de plan', { exact: true })).toBeVisible()
  const panel = await boxOf(screen.panel)
  const map = await boxOf(screen.map)
  expect(liesInside(panel, map)).toBe(true)
  expect(panel.x - map.x).toBeLessThan(map.x + map.width - panel.x)
  expect(panel.y - map.y).toBeLessThan(map.y + map.height - panel.y)

  for (const covered of [screen.zoomIn, screen.credits, screen.viewIndicator]) {
    await expect(covered).toBeVisible()
    expect(overlaps(panel, await boxOf(covered))).toBe(false)
  }

  await expectNamesInOrder(screen.panel.getByRole('group'), ['CARTO', 'Esri'])
  const carto = screen.panel.getByRole('group', { name: 'CARTO', exact: true })
  const esri = screen.panel.getByRole('group', { name: 'Esri', exact: true })
  await expect(carto.getByText('CARTO', { exact: true })).toBeVisible()
  await expect(esri.getByText('Esri', { exact: true })).toBeVisible()
  await expectNamesInOrder(carto.getByRole('radio'), ['Positron', 'Dark Matter'])
  await expectNamesInOrder(esri.getByRole('radio'), ['World Imagery', 'World Topographic Map'])
})

test('basemap-panel 2: the panel offers no other basemap', async ({ page }) => {
  await serveTilesLocally(page)
  const screen = mapScreen(page)
  await page.goto('/')

  await expect(screen.panel.getByRole('radio')).toHaveCount(4)
  await expect(screen.panel.getByRole('group')).toHaveCount(2)
})
