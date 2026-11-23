import { expect, test } from '@playwright/test'

import { boxOf, mapScreen, zoomInOnce } from './mapScreen'
import { serveTilesLocally } from './tiles'

// Executable form of qa/procedures/base-map.md.

test('base-map 1: the map is displayed at its initial view', async ({ page }) => {
  const requested = await serveTilesLocally(page)
  const screen = mapScreen(page)

  await page.goto('/')

  await expect(screen.header).toBeVisible()
  await expect(screen.map.getByRole('region', { name: 'Map' })).toBeVisible()
  const header = await boxOf(page.getByRole('banner'))
  const map = await boxOf(screen.map)
  const viewport = page.viewportSize()
  expect(map.y).toBe(header.y + header.height)
  expect(map.width).toBe(viewport?.width)
  expect(map.y + map.height).toBe(viewport?.height)
  await expect(screen.viewIndicator).toHaveText('45.5646° N, 5.9178° E · zoom 5.0')
  await expect(screen.credits).toContainText('OpenStreetMap contributors')
  await expect.poll(() => requested.length).toBeGreaterThan(0)
})

test('base-map 2: zooming in updates the view indicator', async ({ page }) => {
  await serveTilesLocally(page)
  const screen = mapScreen(page)
  await page.goto('/')

  await zoomInOnce(screen)

  await expect(screen.viewIndicator).toHaveText(/zoom 6\.0$/)
})
