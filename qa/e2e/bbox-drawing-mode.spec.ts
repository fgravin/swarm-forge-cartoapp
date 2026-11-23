import { expect, test } from '@playwright/test'

import { drawBbox, expectCrosshair, expectDrawingButtonPressed, NO_BBOX } from './bbox'
import { boxOf, liesInside, openApplication, overlaps, steadyText, tabUntilFocused } from './mapScreen'
import {
  areaBetween,
  expectMapLooksDifferent,
  expectMapLooksLike,
  expectRectangleOver,
  takeSettledMapPicture,
} from './pictures'
import { dragOnMap, mapCentre, moveTo, offset, pressAt } from './pointer'

// Executable form of qa/procedures/bbox-drawing-mode.md.

test('bbox-drawing-mode 1: the drawing mode is off when the application starts', async ({ page }) => {
  const { screen } = await openApplication(page)

  await expectDrawingButtonPressed(screen, false)
  await expect(screen.bboxPanel).toBeVisible()
  const map = await boxOf(screen.map)
  const drawButton = await boxOf(screen.drawButton)
  const bboxPanel = await boxOf(screen.bboxPanel)
  expect(liesInside(drawButton, map)).toBe(true)
  expect(liesInside(bboxPanel, map)).toBe(true)

  for (const other of [screen.panel, screen.zoomIn, screen.credits, screen.viewIndicator]) {
    const box = await boxOf(other)
    expect(overlaps(drawButton, box)).toBe(false)
    expect(overlaps(bboxPanel, box)).toBe(false)
  }
  expect(overlaps(drawButton, bboxPanel)).toBe(false)

  await expectCrosshair(screen, false)

  const c = await mapCentre(screen)
  const before = await steadyText(screen.viewIndicator)
  await dragOnMap(page, c, offset(c, 100, 0))
  await expect(screen.viewIndicator).not.toHaveText(before)
})

test('bbox-drawing-mode 2: the drawing button turns the drawing mode on', async ({ page }) => {
  const { screen } = await openApplication(page)

  await screen.drawButton.click()
  await expectDrawingButtonPressed(screen, true)

  await expectCrosshair(screen, true)

  const c = await mapCentre(screen)
  const noted = await steadyText(screen.viewIndicator)
  await dragOnMap(page, c, offset(c, 200, 100))
  expect(await steadyText(screen.viewIndicator)).toBe(noted)
})

test('bbox-drawing-mode 3: the drawing button turns the drawing mode off again', async ({ page }) => {
  const { screen } = await openApplication(page)

  await screen.drawButton.click()
  await screen.drawButton.click()
  await expectDrawingButtonPressed(screen, false)

  await expectCrosshair(screen, false)

  const c = await mapCentre(screen)
  const before = await steadyText(screen.viewIndicator)
  await dragOnMap(page, c, offset(c, 100, 0))
  await expect(screen.viewIndicator).not.toHaveText(before)
  await expect(screen.bboxText).toHaveText(NO_BBOX)
})

test('bbox-drawing-mode 4: Escape leaves the drawing mode', async ({ page }) => {
  const { screen } = await openApplication(page)

  await tabUntilFocused(page, screen.drawButton)
  await page.keyboard.press('Enter')
  await expectDrawingButtonPressed(screen, true)

  await page.keyboard.press('Escape')
  await expectDrawingButtonPressed(screen, false)
  await expectCrosshair(screen, false)
})

test('bbox-drawing-mode 5: Escape cancels the rectangle being drawn and keeps the previous bbox', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)
  const blank = await takeSettledMapPicture(page, c)

  const notedBbox = await drawBbox(page, screen, offset(c, -150, -150), offset(c, -50, -50))
  const notedView = await steadyText(screen.viewIndicator)
  await expectRectangleOver(page, blank, areaBetween(-150, -150, -50, -50))
  const picture = await takeSettledMapPicture(page, c)

  await screen.drawButton.click()
  await pressAt(page, offset(c, 50, 50))
  await moveTo(page, offset(c, 150, 150))
  await expectMapLooksDifferent(page, picture)

  await page.keyboard.press('Escape')
  await page.mouse.up()

  await expectDrawingButtonPressed(screen, false)
  await expect(screen.bboxText).toHaveText(notedBbox)
  await expect(screen.viewIndicator).toHaveText(notedView)
  await expectMapLooksLike(page, picture)
})
