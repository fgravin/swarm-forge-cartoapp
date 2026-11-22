import { expect, test } from '@playwright/test'

import { serveTilesLocally } from './tiles'

// Executable form of qa/procedures/base-map.md.

const OSM_TILES = 'https://tile.openstreetmap.org/**'

test('base-map 1: the map is displayed at its initial view', async ({ page }) => {
  const requestedTiles = await serveTilesLocally(page, OSM_TILES)

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Carto App' })).toBeVisible()
  await expect(page.getByTestId('map').locator('canvas')).toBeVisible()
  await expect(page.getByTestId('map-view')).toHaveText('45.5646° N, 5.9178° E · zoom 5.0')
  await expect(page.getByTestId('map')).toContainText('OpenStreetMap')
  await expect.poll(() => requestedTiles.length).toBeGreaterThan(0)
})

test('base-map 2: zooming in updates the view indicator', async ({ page }) => {
  await serveTilesLocally(page, OSM_TILES)
  await page.goto('/')

  await page.getByRole('button', { name: 'Zoom in' }).click()

  await expect(page.getByTestId('map-view')).toHaveText(/zoom 6\.0$/)
})
