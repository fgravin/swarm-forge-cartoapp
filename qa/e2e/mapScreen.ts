import { expect, type Locator, type Page } from '@playwright/test'

import { BASEMAP_NAMES, BASEMAP_TILES, type BasemapName } from './basemaps'
import { serversOf, tilesOf, type Tile } from './tiles'

/** What the user sees of the map screen, found by role, accessible name, and visible text. */
export interface MapScreen {
  readonly header: Locator
  readonly map: Locator
  readonly zoomIn: Locator
  /** The attribution text at the bottom right of the map. */
  readonly credits: Locator
  /** The view indicator at the bottom left of the map. */
  readonly viewIndicator: Locator
  readonly panel: Locator
  basemap(name: BasemapName): Locator
}

export function mapScreen(page: Page): MapScreen {
  const map = page.getByTestId('map')
  return {
    header: page.getByRole('heading', { name: 'Carto App' }),
    map,
    zoomIn: page.getByRole('button', { name: 'Zoom in' }),
    // The credits are the one group of the map without a name.
    credits: map.getByRole('group'),
    viewIndicator: page.getByTestId('map-view'),
    panel: page.getByRole('group', { name: 'Fonds de plan', exact: true }),
    basemap: (name) => page.getByRole('radio', { name, exact: true }),
  }
}

/** Expects `selected` to be the only checked basemap. */
export async function expectOnlySelected(screen: MapScreen, selected: BasemapName): Promise<void> {
  for (const name of BASEMAP_NAMES) {
    if (name === selected) await expect(screen.basemap(name)).toBeChecked()
    else await expect(screen.basemap(name)).not.toBeChecked()
  }
}

/**
 * Expects the credits to contain `credited` and none of `notCredited`. The map
 * credits the active basemap only (the features' "the map credits only"), so
 * the credits read `credited` and nothing else, such as a credit for MapLibre.
 */
export async function expectCredits(
  screen: MapScreen,
  credited: string,
  notCredited: readonly string[],
): Promise<void> {
  await expect(screen.credits).toContainText(credited)
  for (const text of notCredited) await expect(screen.credits).not.toContainText(text)
  await expect(screen.credits).toHaveText(credited)
}

/** Where `locator` is on screen. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error(`${locator.toString()} is not on screen.`)
  return box
}

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The tiles of `basemap` among `urls`. */
export function basemapTiles(basemap: BasemapName, urls: readonly string[]): readonly Tile[] {
  return tilesOf(BASEMAP_TILES[basemap].tileUrl, urls)
}

/**
 * Expects the map to request tiles of `basemap` from each of its servers.
 * `since` is the number of requests made before the step began.
 */
export async function expectTilesFromEveryServer(
  basemap: BasemapName,
  requested: readonly string[],
  since = 0,
): Promise<void> {
  const { tileUrl } = BASEMAP_TILES[basemap]
  await expect
    .poll(() => new Set(tilesOf(tileUrl, requested.slice(since)).map((tile) => tile.server)))
    .toEqual(new Set(serversOf(tileUrl)))
}

/**
 * Expects the map to request tiles of `basemap` from each of its servers,
 * including the tile that holds the initial centre. `since` is the number of
 * requests made before the step began.
 */
export async function expectCentreTilesFrom(
  basemap: BasemapName,
  requested: readonly string[],
  since = 0,
): Promise<void> {
  const { centreTile } = BASEMAP_TILES[basemap]
  await expect
    .poll(() => basemapTiles(basemap, requested.slice(since)).some((tile) => tile.url.endsWith(centreTile)))
    .toBe(true)
  await expectTilesFromEveryServer(basemap, requested, since)
}

const ZOOM = /zoom (\d+\.\d)$/

/** The zoom the view indicator shows. */
export async function shownZoom(screen: MapScreen): Promise<number> {
  const match = ZOOM.exec(await screen.viewIndicator.innerText())
  if (match?.[1] === undefined) throw new Error('The view indicator shows no zoom.')
  return Number(match[1])
}

/**
 * Presses the "Zoom in" button once and waits until the view indicator shows
 * the next zoom level and stops changing: the indicator rounds the zoom, so it
 * shows the next level before the zoom animation ends.
 */
export async function zoomInOnce(screen: MapScreen): Promise<void> {
  const next = (await shownZoom(screen)) + 1
  await screen.zoomIn.click()
  await expect(screen.viewIndicator).toHaveText(new RegExp(`zoom ${next}\\.0$`))
  await steadyText(screen.viewIndicator)
}

/** Presses the "Zoom in" button until the zoom the view indicator shows stops growing. */
export async function zoomInAllTheWay(screen: MapScreen): Promise<void> {
  while (await screen.zoomIn.isEnabled()) await zoomInOnce(screen)
}

/** Waits until the text of `locator` reads the same for half a second, and returns it. */
export async function steadyText(locator: Locator): Promise<string> {
  let previous = await locator.innerText()
  let steadyReads = 0
  while (steadyReads < 5) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const current = await locator.innerText()
    steadyReads = current === previous ? steadyReads + 1 : 0
    previous = current
  }
  return previous
}

/** Presses Tab until `target` has the focus. */
export async function tabUntilFocused(page: Page, target: Locator, maxPresses = 20): Promise<void> {
  for (let presses = 0; presses < maxPresses; presses++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === element.ownerDocument.activeElement)) return
  }
  throw new Error(`The focus did not reach the target after ${maxPresses} presses of Tab.`)
}
