import { expect, test } from '@playwright/test'

import {
  drawBbox,
  expectBboxNear,
  expectBboxShown,
  expectCrosshair,
  expectDrawingButtonPressed,
  NO_BBOX,
  SQUARE_AROUND_CENTRE,
} from './bbox'
import { mapScreen, openApplication, steadyText } from './mapScreen'
import {
  areaBetween,
  expectMapLooksDifferent,
  expectRectangleOver,
  takeSettledMapPicture,
} from './pictures'
import { dragOnMap, mapCentre, moveTo, offset, pressAt, release, slideFinger } from './pointer'
import { serveTilesLocally } from './tiles'

// Executable form of qa/procedures/bbox-capture.md.

interface DirectionRow {
  readonly direction: string
  readonly from: readonly [number, number]
  readonly to: readonly [number, number]
}

const DIRECTIONS: readonly DirectionRow[] = [
  { direction: 'north-east', from: [-100, 100], to: [100, -100] },
  { direction: 'south-west', from: [100, -100], to: [-100, 100] },
  { direction: 'south-east', from: [-100, -100], to: [100, 100] },
  { direction: 'north-west', from: [100, 100], to: [-100, -100] },
]

test('bbox-capture 1: the drawn rectangle becomes the bbox, whatever the drawing direction', async ({ page }) => {
  await serveTilesLocally(page)
  const screen = mapScreen(page)
  const texts: string[] = []
  for (const row of DIRECTIONS) {
    await test.step(row.direction, async () => {
      await page.goto('/')
      const c = await mapCentre(screen)

      await screen.drawButton.click()
      await dragOnMap(page, offset(c, ...row.from), offset(c, ...row.to))

      texts.push(await expectBboxNear(screen, SQUARE_AROUND_CENTRE))
    })
  }
  expect(new Set(texts).size).toBe(1)
})

test('bbox-capture 2: capturing a bbox leaves its rectangle on the map and ends the drawing mode', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)
  const blank = await takeSettledMapPicture(page, c)

  await drawBbox(page, screen, offset(c, 100, -100), offset(c, -100, 100))

  await expectDrawingButtonPressed(screen, false)
  await expectCrosshair(screen, false)

  await expectRectangleOver(page, blank, areaBetween(-100, -100, 100, 100))

  const before = await steadyText(screen.viewIndicator)
  await dragOnMap(page, c, offset(c, 100, 0))
  await expect(screen.viewIndicator).not.toHaveText(before)
})

test('bbox-capture 3: the rectangle follows the pointer while it is drawn', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)
  const blank = await takeSettledMapPicture(page, c)

  await screen.drawButton.click()

  await pressAt(page, c)
  await moveTo(page, offset(c, 100, 100))
  await expectRectangleOver(page, blank, areaBetween(0, 0, 100, 100))
  await expect(screen.bboxText).toHaveText(NO_BBOX)
  const picture = await takeSettledMapPicture(page, c)

  await moveTo(page, offset(c, -100, -100))
  await expectMapLooksDifferent(page, picture)
  await expectRectangleOver(page, blank, areaBetween(-100, -100, 0, 0))

  await release(page)
  await expectBboxShown(screen)
})

test('bbox-capture 4: a new bbox replaces the previous one', async ({ page }) => {
  const { screen } = await openApplication(page)
  const c = await mapCentre(screen)
  const blank = await takeSettledMapPicture(page, c)

  const noted = await drawBbox(page, screen, offset(c, -150, -150), offset(c, -50, -50))

  await screen.drawButton.click()
  await dragOnMap(page, offset(c, 50, 50), offset(c, 150, 150))

  await expect(screen.bboxText).not.toHaveText(noted)
  await expectBboxShown(screen)

  await expectRectangleOver(page, blank, areaBetween(50, 50, 150, 150))
})

interface SizeRow {
  readonly width: number
  readonly height: number
  readonly captures: boolean
}

// "the text noted at step 2" and "pressed", or "a bbox other than that text" and "not pressed".
const SIZES: readonly SizeRow[] = [
  { width: 2, height: 3, captures: false },
  { width: 3, height: 2, captures: false },
  { width: 0, height: 0, captures: false },
  { width: 3, height: 3, captures: true },
]

test.describe('bbox-capture 5: a drag must be at least 3 pixels wide and high to capture a bbox', () => {
  for (const row of SIZES) {
    test(`${row.width} by ${row.height}`, async ({ page }) => {
      const { screen } = await openApplication(page)
      const c = await mapCentre(screen)

      const noted = await drawBbox(page, screen, offset(c, -150, -150), offset(c, -50, -50))

      await screen.drawButton.click()

      if (row.width === 0 && row.height === 0) await page.mouse.click(c.x, c.y)
      else await dragOnMap(page, c, offset(c, row.width, row.height))

      if (row.captures) {
        await expect(screen.bboxText).not.toHaveText(noted)
        await expectBboxShown(screen)
      } else {
        await expect(screen.bboxText).toHaveText(noted)
      }
      await expectDrawingButtonPressed(screen, !row.captures)
    })
  }
})

test.describe('bbox-capture 6: a bbox can be drawn by touch', () => {
  test.use({ hasTouch: true })

  test('on a touch screen', async ({ page }) => {
    const { screen } = await openApplication(page)
    const c = await mapCentre(screen)

    await screen.drawButton.tap()

    const before = await steadyText(screen.viewIndicator)
    await slideFinger(page, offset(c, -100, 100), offset(c, 100, -100))

    await expectBboxNear(screen, SQUARE_AROUND_CENTRE)
    await expectDrawingButtonPressed(screen, false)
    expect(await steadyText(screen.viewIndicator)).toBe(before)
  })
})
