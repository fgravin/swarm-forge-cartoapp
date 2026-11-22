import { expect, test } from '@playwright/test'

import { CARTO_CREDITS, ESRI_CREDITS } from './basemaps'
import {
  basemapTiles,
  expectCentreTilesFrom,
  expectCredits,
  expectOnlySelected,
  expectTilesFromEveryServer,
  mapScreen,
  steadyText,
  tabUntilFocused,
  zoomInOnce,
} from './mapScreen'
import { serveTilesLocally } from './tiles'

// Executable form of qa/procedures/basemap-selection.md.

test('basemap-selection 1: Positron is selected when the application starts', async ({ page }) => {
  const requested = await serveTilesLocally(page)
  const screen = mapScreen(page)

  await page.goto('/')

  await expectOnlySelected(screen, 'Positron')
  await expectCentreTilesFrom('Positron', requested)
  for (const elsewhere of ['tile.openstreetmap.org', '/dark_all/', 'server.arcgisonline.com']) {
    expect(requested.filter((url) => url.includes(elsewhere))).toEqual([])
  }
  await expectCredits(screen, CARTO_CREDITS, [ESRI_CREDITS])
})

test('basemap-selection 2: choosing a basemap selects it alone', async ({ page }) => {
  await serveTilesLocally(page)
  const screen = mapScreen(page)
  await page.goto('/')
  await expectOnlySelected(screen, 'Positron')

  const before = await screen.panel.screenshot()

  await screen.basemap('Dark Matter').click()
  await expectOnlySelected(screen, 'Dark Matter')

  await screen.header.click()
  await expect(screen.basemap('Dark Matter')).not.toBeFocused()
  expect((await screen.panel.screenshot()).equals(before)).toBe(false)

  await screen.basemap('World Imagery').click()
  await expectOnlySelected(screen, 'World Imagery')

  await screen.basemap('World Topographic Map').click()
  await expectOnlySelected(screen, 'World Topographic Map')

  await screen.basemap('Positron').click()
  await expectOnlySelected(screen, 'Positron')

  await screen.basemap('Positron').click()
  await expectOnlySelected(screen, 'Positron')
})

test('basemap-selection 3: changing the basemap keeps the view', async ({ page }) => {
  const requested = await serveTilesLocally(page)
  const screen = mapScreen(page)
  await page.goto('/')
  await expect(screen.viewIndicator).toHaveText(/zoom 5\.0$/)

  await zoomInOnce(screen)
  await zoomInOnce(screen)
  const map = await screen.map.boundingBox()
  if (map === null) throw new Error('The map is not on screen.')
  const x = map.x + map.width / 2
  const y = map.y + map.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 200, y, { steps: 10 })
  await page.mouse.up()
  const noted = await steadyText(screen.viewIndicator)
  expect(noted).toMatch(/zoom 7\.0$/)
  expect(noted).not.toBe('45.5646° N, 5.9178° E · zoom 7.0')

  const since = requested.length
  await screen.basemap('World Imagery').click()

  await expect(screen.basemap('World Imagery')).toBeChecked()
  await expect(screen.viewIndicator).toHaveText(noted)
  await expect
    .poll(() => basemapTiles('World Imagery', requested.slice(since)).some((tile) => tile.z === 8))
    .toBe(true)
  await expect(screen.viewIndicator).toHaveText(noted)
})

test('basemap-selection 4: the basemap is chosen from the keyboard', async ({ page }) => {
  const requested = await serveTilesLocally(page)
  const screen = mapScreen(page)
  await page.goto('/')
  await expectCentreTilesFrom('Positron', requested)
  const unfocused = await screen.panel.screenshot()

  await tabUntilFocused(page, screen.basemap('Positron'))
  expect((await screen.panel.screenshot()).equals(unfocused)).toBe(false)

  let since = requested.length
  await page.keyboard.press('ArrowDown')
  await expect(screen.basemap('Dark Matter')).toBeFocused()
  await expectOnlySelected(screen, 'Dark Matter')
  await expectTilesFromEveryServer('Dark Matter', requested, since)

  since = requested.length
  await page.keyboard.press('ArrowDown')
  await expect(screen.basemap('World Imagery')).toBeFocused()
  await expectOnlySelected(screen, 'World Imagery')
  await expect.poll(() => basemapTiles('World Imagery', requested.slice(since)).length).toBeGreaterThan(0)
  await expectCredits(screen, ESRI_CREDITS, ['CARTO'])

  await page.keyboard.press('ArrowDown')
  await expectOnlySelected(screen, 'World Topographic Map')

  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expectOnlySelected(screen, 'Positron')
  await expectCredits(screen, CARTO_CREDITS, [ESRI_CREDITS])
})
