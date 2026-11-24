import { expect } from '@playwright/test'

import { steadyText, type MapScreen } from './mapScreen'

// What the view indicator, at the bottom left of the map, reads: a centre and
// a zoom, as in `45.5646° N, 5.9178° E · zoom 5.0`.

// The map may fly there: from zoom 5 to zoom 17, the flight takes a few seconds.
const FLIGHT_TIMEOUT = 15_000

/** "Expect the view indicator to read `text`", once it stops changing. */
export async function expectViewReads(screen: MapScreen, text: string): Promise<void> {
  await expect(screen.viewIndicator).toHaveText(text, { timeout: FLIGHT_TIMEOUT })
  expect(await steadyText(screen.viewIndicator)).toBe(text)
}

/** Degrees north and east, and a zoom. */
export interface View {
  readonly lat: number
  readonly lng: number
  readonly zoom: number
}

const VIEW_TEXT = /^(\d+\.\d+)° ([NS]), (\d+\.\d+)° ([EW]) · zoom (\d+\.\d)$/

export function readView(text: string): View {
  const [, lat, ns, lng, ew, zoom] = VIEW_TEXT.exec(text) ?? []
  if (zoom === undefined) throw new Error(`The view indicator reads "${text}".`)
  return {
    lat: Number(lat) * (ns === 'S' ? -1 : 1),
    lng: Number(lng) * (ew === 'W' ? -1 : 1),
    zoom: Number(zoom),
  }
}

/** From the first value to the second, both included. */
export type Range = readonly [number, number]

/** A centre and a zoom within ranges, as the procedures write them. */
export interface ViewRanges {
  readonly lat: Range
  readonly lng: Range
  readonly zoom: Range
}

function expectWithin(value: number, [low, high]: Range, what: string): void {
  expect(value, what).toBeGreaterThanOrEqual(low)
  expect(value, what).toBeLessThanOrEqual(high)
}

/**
 * Expects the view indicator to change from `before`, then to show a centre
 * and a zoom within `ranges` once it stops changing.
 */
export async function expectViewWithin(screen: MapScreen, before: string, ranges: ViewRanges): Promise<void> {
  await expect(screen.viewIndicator).not.toHaveText(before)
  const text = await steadyText(screen.viewIndicator)
  const view = readView(text)
  expectWithin(view.lat, ranges.lat, `the latitude of ${text}`)
  expectWithin(view.lng, ranges.lng, `the longitude of ${text}`)
  expectWithin(view.zoom, ranges.zoom, `the zoom of ${text}`)
}
