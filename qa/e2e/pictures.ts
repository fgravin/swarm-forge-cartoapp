import { expect, type Locator, type Page } from '@playwright/test'

import { decodePng, type Colour, type Pixels } from './png'
import type { Point } from './pointer'

// A picture of the map is the part of it around C, on the 1280 by 720 page:
// from 320 pixels left of C to 400 pixels right of it, and 280 pixels above and
// below it. The panels on the left reach about 290 pixels into the page. The
// "Couches" panel, on the right, reaches into the picture: its pixels are left
// out of every comparison.
const LEFT = 320
const RIGHT = 400
const ABOVE = 280
const BELOW = 280

/** A picture of the map around C. */
export interface MapPicture {
  readonly centre: Point
  readonly pixels: Pixels
  /** Where panels over the map lie in the picture: what they show is not the map's. */
  readonly covered: readonly Area[]
}

/** An area of the map, in pixels from C: negative is left of C or above it. */
export interface Area {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

// The panels over the map that reach into a picture: the "Couches" panel, on the right.
const coveringPanels = (page: Page): Locator => page.getByRole('region', { name: 'Couches', exact: true })

/** Where the panels over the map lie, in pixels from C. */
async function coveredAreas(page: Page, centre: Point): Promise<readonly Area[]> {
  const boxes = await Promise.all((await coveringPanels(page).all()).map((panel) => panel.boundingBox()))
  return boxes.flatMap((box) =>
    box === null
      ? []
      : [areaBetween(box.x - centre.x, box.y - centre.y, box.x + box.width - centre.x, box.y + box.height - centre.y)],
  )
}

export async function takeMapPicture(page: Page, centre: Point): Promise<MapPicture> {
  const clip = { x: centre.x - LEFT, y: centre.y - ABOVE, width: LEFT + RIGHT, height: ABOVE + BELOW }
  const covered = await coveredAreas(page, centre)
  return { centre, pixels: decodePng(await page.screenshot({ clip })), covered }
}

function liesIn(area: Area, x: number, y: number): boolean {
  return x >= area.left && x <= area.right && y >= area.top && y <= area.bottom
}

/** The colour of the map `dx` pixels right of C and `dy` pixels below it. */
export function colourAt({ pixels }: MapPicture, dx = 0, dy = 0): Colour {
  const index = ((ABOVE + dy) * pixels.width + LEFT + dx) * pixels.channels
  return [pixels.data.readUInt8(index), pixels.data.readUInt8(index + 1), pixels.data.readUInt8(index + 2)]
}

// Colour levels a pixel may move by without looking different.
const COLOUR_TOLERANCE = 8

function pixelDiffers(a: Pixels, b: Pixels, index: number): boolean {
  for (let channel = 0; channel < a.channels; channel++) {
    const difference = Math.abs(a.data.readUInt8(index + channel) - b.data.readUInt8(index + channel))
    if (difference > COLOUR_TOLERANCE) return true
  }
  return false
}

function grow(area: Area | undefined, x: number, y: number): Area {
  if (area === undefined) return { left: x, top: y, right: x, bottom: y }
  return {
    left: Math.min(area.left, x),
    top: Math.min(area.top, y),
    right: Math.max(area.right, x),
    bottom: Math.max(area.bottom, y),
  }
}

/**
 * The smallest area that holds every pixel of the map where the two pictures
 * differ, or undefined when the map looks the same. Panels are not the map.
 */
export function changedArea(before: MapPicture, after: MapPicture): Area | undefined {
  const { width, height, channels } = after.pixels
  const covered = [...before.covered, ...after.covered]
  let area: Area | undefined
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [dx, dy] = [x - LEFT, y - ABOVE]
      if (covered.some((panel) => liesIn(panel, dx, dy))) continue
      if (pixelDiffers(before.pixels, after.pixels, (y * width + x) * channels)) area = grow(area, dx, dy)
    }
  }
  return area
}

const SETTLE_INTERVAL_MS = 150
const SETTLED_PICTURES = 3

/**
 * Takes pictures of the map until it stops changing, as tiles fade in, and
 * returns the last one.
 */
export async function takeSettledMapPicture(page: Page, centre: Point): Promise<MapPicture> {
  let previous = await takeMapPicture(page, centre)
  for (let unchanged = 0; unchanged < SETTLED_PICTURES; ) {
    await page.waitForTimeout(SETTLE_INTERVAL_MS)
    const next = await takeMapPicture(page, centre)
    unchanged = changedArea(previous, next) === undefined ? unchanged + 1 : 0
    previous = next
  }
  return previous
}

// The map redraws a frame after the page changes: give it time.
const REDRAW_TIMEOUT = { timeout: 10_000 }

/** Expects the map to look like `picture`. */
export async function expectMapLooksLike(page: Page, picture: MapPicture): Promise<void> {
  await expect(async () => {
    expect(changedArea(picture, await takeMapPicture(page, picture.centre))).toBeUndefined()
  }).toPass(REDRAW_TIMEOUT)
}

/** Expects the map to look different from `picture`. */
export async function expectMapLooksDifferent(page: Page, picture: MapPicture): Promise<void> {
  await expect(async () => {
    expect(changedArea(picture, await takeMapPicture(page, picture.centre))).toBeDefined()
  }).toPass(REDRAW_TIMEOUT)
}

// Pixels the rectangle's outline and its antialiasing reach past its corners.
const OUTLINE_SLACK = 4

/**
 * Expects the map to look like `picture` but for a rectangle with its corners
 * at `rectangle`, give or take its outline: different on the rectangle's edges,
 * the same well outside it.
 */
export async function expectRectangleOver(page: Page, picture: MapPicture, rectangle: Area): Promise<void> {
  await expect(async () => {
    const area = changedArea(picture, await takeMapPicture(page, picture.centre))
    if (area === undefined) throw new Error('The map shows no rectangle.')
    const sides = [
      area.left - rectangle.left,
      area.top - rectangle.top,
      area.right - rectangle.right,
      area.bottom - rectangle.bottom,
    ]
    const message = `The map changed over ${JSON.stringify(area)}, not ${JSON.stringify(rectangle)}.`
    expect(Math.max(...sides.map(Math.abs)), message).toBeLessThanOrEqual(OUTLINE_SLACK)
  }).toPass(REDRAW_TIMEOUT)
}

/** The area between two corners given in pixels from C, whatever corner each one is. */
export function areaBetween(dx1: number, dy1: number, dx2: number, dy2: number): Area {
  return {
    left: Math.min(dx1, dx2),
    top: Math.min(dy1, dy2),
    right: Math.max(dx1, dx2),
    bottom: Math.max(dy1, dy2),
  }
}
