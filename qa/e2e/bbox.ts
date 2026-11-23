import { expect, type Page } from '@playwright/test'

import type { MapScreen } from './mapScreen'
import { dragOnMap, type Point } from './pointer'

// The bbox as the procedures describe it (qa/procedures/bbox-*.md).

export const NO_BBOX = 'Aucune emprise'

/** West, south, east, north, in WGS84 degrees. */
export type Bbox = readonly [west: number, south: number, east: number, north: number]

/** Four numbers with exactly 5 decimals, separated by a comma and a space. */
const BBOX_TEXT = /^(-?\d+\.\d{5}), (-?\d+\.\d{5}), (-?\d+\.\d{5}), (-?\d+\.\d{5})$/

/** At the initial view, the bbox of a 200-pixel square centred on C. */
export const SQUARE_AROUND_CENTRE: Bbox = [3.72053, 44.00522, 8.11507, 47.08187]

// A position on the screen is known to about half a pixel.
const DEGREES_TOLERANCE = 0.02

/** Expects "Dessiner une emprise" to be pressed, or not. */
export async function expectDrawingButtonPressed(screen: MapScreen, pressed: boolean): Promise<void> {
  await expect(screen.drawButton).toBeVisible()
  await expect(screen.drawButton).toHaveAttribute('aria-pressed', String(pressed))
}

/** Expects the mouse cursor over the map to be a crosshair, or not. */
export async function expectCrosshair(screen: MapScreen, crosshair: boolean): Promise<void> {
  if (crosshair) await expect(screen.surface).toHaveCSS('cursor', 'crosshair')
  else await expect(screen.surface).not.toHaveCSS('cursor', 'crosshair')
}

/** Expects the "Emprise" panel to show a bbox, and returns its text. */
export async function expectBboxShown(screen: MapScreen): Promise<string> {
  await expect(screen.bboxText).toHaveText(BBOX_TEXT)
  return screen.bboxText.innerText()
}

/** Expects the "Emprise" panel to read `expected`, within 0.02 degrees, and returns its text. */
export async function expectBboxNear(screen: MapScreen, expected: Bbox): Promise<string> {
  const text = await expectBboxShown(screen)
  const shown = BBOX_TEXT.exec(text)?.slice(1).map(Number) ?? []
  expect(shown).toHaveLength(expected.length)
  for (const [index, degrees] of expected.entries()) {
    expect(Math.abs((shown[index] ?? NaN) - degrees), `${text} against ${expected.join(', ')}`).toBeLessThanOrEqual(
      DEGREES_TOLERANCE,
    )
  }
  return text
}

/** "Click 'Dessiner une emprise' and drag on the map from P to Q." Returns the text of the "Emprise" panel. */
export async function drawBbox(page: Page, screen: MapScreen, from: Point, to: Point): Promise<string> {
  await screen.drawButton.click()
  await dragOnMap(page, from, to)
  return expectBboxShown(screen)
}
