import type { Page } from '@playwright/test'

import { boxOf, type MapScreen } from './mapScreen'

/** A position on the page, in pixels. */
export interface Point {
  readonly x: number
  readonly y: number
}

/** C, the centre of the map, to the nearest pixel. */
export async function mapCentre(screen: MapScreen): Promise<Point> {
  const map = await boxOf(screen.map)
  return { x: Math.round(map.x + map.width / 2), y: Math.round(map.y + map.height / 2) }
}

/** P+(dx,dy): `dx` pixels right of P and `dy` pixels below it. */
export function offset(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy }
}

const STEPS = 10
// A pause before releasing ends a drag at rest, so the map keeps no momentum.
const PAUSE_MS = 200

export async function pressAt(page: Page, point: Point): Promise<void> {
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
}

/** Moves the mouse to `point` in small steps. */
export async function moveTo(page: Page, point: Point): Promise<void> {
  await page.mouse.move(point.x, point.y, { steps: STEPS })
}

/** Pauses, then releases the mouse button. */
export async function release(page: Page): Promise<void> {
  await page.waitForTimeout(PAUSE_MS)
  await page.mouse.up()
}

/** "Drag on the map from P to Q": press the mouse button at P, move to Q in small steps, pause, then release. */
export async function dragOnMap(page: Page, from: Point, to: Point): Promise<void> {
  await pressAt(page, from)
  await moveTo(page, to)
  await release(page)
}

/**
 * Touches the screen at `from`, slides the finger to `to` in small steps, pauses,
 * then lifts it. Playwright only taps, so the touches go through the browser's
 * own input protocol.
 */
export async function slideFinger(page: Page, from: Point, to: Point): Promise<void> {
  const session = await page.context().newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let step = 1; step <= STEPS; step++) {
    const x = from.x + ((to.x - from.x) * step) / STEPS
    const y = from.y + ((to.y - from.y) * step) / STEPS
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
  }
  await page.waitForTimeout(PAUSE_MS)
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await session.detach()
}
