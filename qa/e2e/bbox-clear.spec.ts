import { expect, test } from '@playwright/test'

import { drawBbox, NO_BBOX } from './bbox'
import { openApplication } from './mapScreen'
import { expectMapLooksDifferent, expectMapLooksLike, takeSettledMapPicture } from './pictures'
import { mapCentre, offset } from './pointer'

// Executable form of qa/procedures/bbox-clear.md.

test('bbox-clear 1: without a bbox, the panel says so and clearing is not offered', async ({ page }) => {
  const { screen } = await openApplication(page)

  await expect(screen.bboxText).toHaveText(NO_BBOX)
  await expect(screen.clearButton).toHaveCount(0)
})

test('bbox-clear 2: clearing is offered once a bbox is captured', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)

  await drawBbox(page, screen, offset(c, -100, -100), offset(c, 100, 100))

  await expect(screen.clearButton).toBeVisible()
})

test('bbox-clear 3: clearing removes the rectangle and empties the panel', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)
  const picture = await takeSettledMapPicture(page, c)

  await drawBbox(page, screen, offset(c, -100, -100), offset(c, 100, 100))
  await expectMapLooksDifferent(page, picture)

  await screen.clearButton.click()

  await expect(screen.bboxText).toHaveText(NO_BBOX)
  await expect(screen.clearButton).toHaveCount(0)
  await expectMapLooksLike(page, picture)
})
