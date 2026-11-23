import { expect, test } from '@playwright/test'

import { drawBbox } from './bbox'
import { basemapTiles, openApplication, steadyText, zoomInOnce } from './mapScreen'
import { areaBetween, expectMapLooksLike, expectRectangleOver, takeSettledMapPicture } from './pictures'
import { dragOnMap, mapCentre, offset } from './pointer'

// Executable form of qa/procedures/bbox-georeference.md.

test('bbox-georeference 1: moving and zooming the map keeps the bbox in place', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)
  const blank = await takeSettledMapPicture(page, c)

  const noted = await drawBbox(page, screen, offset(c, -100, -100), offset(c, 100, 100))

  await zoomInOnce(screen)
  await expect(screen.viewIndicator).toHaveText(/zoom 6\.0$/)

  await expect(screen.bboxText).toHaveText(noted)
  await expectRectangleOver(page, blank, areaBetween(-200, -200, 200, 200))

  await dragOnMap(page, c, offset(c, 150, 0))
  await steadyText(screen.viewIndicator)

  await expect(screen.bboxText).toHaveText(noted)
  await expectRectangleOver(page, blank, areaBetween(-50, -200, 350, 200))
})

test('bbox-georeference 2: changing the basemap keeps the bbox', async ({ page }) => {
  const { screen, requested } = await openApplication(page)
  const c = await mapCentre(screen)
  const blank = await takeSettledMapPicture(page, c)

  const noted = await drawBbox(page, screen, offset(c, -100, -100), offset(c, 100, 100))
  await expectRectangleOver(page, blank, areaBetween(-100, -100, 100, 100))
  const picture = await takeSettledMapPicture(page, c)

  for (const basemap of ['World Imagery', 'Positron'] as const) {
    await test.step(basemap, async () => {
      const since = requested.length
      await screen.basemap(basemap).click()
      await expect.poll(() => basemapTiles(basemap, requested.slice(since)).length).toBeGreaterThan(0)

      await expect(screen.bboxText).toHaveText(noted)
      await expectMapLooksLike(page, picture)
    })
  }
})
