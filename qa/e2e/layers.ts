import { expect, type Locator, type Page } from '@playwright/test'

import { goToMap, type MapScreen } from './mapScreen'
import { colourAt, takeMapPicture } from './pictures'
import type { Colour } from './png'
import type { Point } from './pointer'
import { escapeRegExp, serveTilesLocally } from './tiles'
import { answerWms, layerAt, requestsOf, type Position, type WmsAnswers, type WmsServers } from './wms'

// The "Couches" panel as the layer procedures describe it (layer-panel.md,
// "What the user sees").

export const LOADING = 'Chargement…'
export const UNAVAILABLE = 'Couche indisponible'
export const LEGEND_UNAVAILABLE = 'Légende indisponible'

/** A layer of the panel: its group, named by what the layer is listed as, and its controls. */
export interface LayerEntry {
  readonly group: Locator
  /** The eye button, "Afficher <title>" or "Masquer <title>". */
  readonly eye: Locator
  readonly zoom: Locator
  readonly slider: Locator
  readonly legendButton: Locator
  /** The unfolded legend image, "Légende de <title>". */
  readonly legendImage: Locator
  /** "Légende indisponible". */
  readonly legendMessage: Locator
  /** The eye button, the zoom button, the opacity slider and the "Légende" button, in this order. */
  readonly controls: readonly Locator[]
}

export interface LayerPanel {
  readonly region: Locator
  /** The layers, in the order of the list. */
  readonly layers: Locator
  /** The layer listed as `listedAs`: its title, or its WMS name while it has none. */
  layer(listedAs: string): LayerEntry
  /** The layer at `position`, listed under the title its server declares. */
  at(position: Position): LayerEntry
}

export function layerPanel(page: Page): LayerPanel {
  const region = page.getByRole('region', { name: 'Couches', exact: true })
  const layer = (listedAs: string): LayerEntry => {
    const group = region.getByRole('group', { name: listedAs, exact: true })
    const eye = group.getByRole('button', { name: new RegExp(`^(Afficher|Masquer) ${escapeRegExp(listedAs)}$`) })
    const zoom = group.getByRole('button', { name: `Zoomer sur ${listedAs}`, exact: true })
    const slider = group.getByRole('slider', { name: `Opacité de ${listedAs}`, exact: true })
    const legendButton = group.getByRole('button', { name: 'Légende', exact: true })
    return {
      group,
      eye,
      zoom,
      slider,
      legendButton,
      legendImage: group.getByRole('img', { name: `Légende de ${listedAs}`, exact: true }),
      legendMessage: group.getByText(LEGEND_UNAVAILABLE, { exact: true }),
      controls: [eye, zoom, slider, legendButton],
    }
  }
  return {
    region,
    layers: region.getByRole('group'),
    layer,
    at: (position) => layer(layerAt(position).title),
  }
}

/** The application, open, with its tile and WMS requests answered locally. */
export interface OpenLayers {
  readonly screen: MapScreen
  readonly panel: LayerPanel
  /** The tile requests. */
  readonly requested: readonly string[]
  readonly wms: WmsServers
}

/** Opens the application with the WMS servers giving `answers`, and waits until the map asks for tiles. */
export async function openLayers(page: Page, answers: WmsAnswers = {}): Promise<OpenLayers> {
  const requested = await serveTilesLocally(page)
  // Playwright tries the routes last registered first: the WMS servers are answered here, not as tiles.
  const wms = await answerWms(page, answers)
  const screen = await goToMap(page, requested)
  return { screen, panel: layerPanel(page), requested, wms }
}

/** Expects the four controls of `layer` to be enabled, or disabled. */
export async function expectControlsEnabled(layer: LayerEntry, enabled: boolean): Promise<void> {
  for (const control of layer.controls) {
    if (enabled) await expect(control).toBeEnabled()
    else await expect(control).toBeDisabled()
  }
}

/** Expects the eye button of the layer `title` to say that the layer is shown, or hidden. */
export async function expectShown(layer: LayerEntry, title: string, shown: boolean): Promise<void> {
  await expect(layer.eye).toHaveAccessibleName(`${shown ? 'Masquer' : 'Afficher'} ${title}`)
  await expect(layer.eye).toHaveAttribute('aria-pressed', String(shown))
}

/** Expects the layers at `positions` to be shown, and the others hidden. */
export async function expectShownLayers(panel: LayerPanel, positions: readonly Position[]): Promise<void> {
  for (const position of [1, 2, 3] as const) {
    await expectShown(panel.at(position), layerAt(position).title, positions.includes(position))
  }
}

/** Presses the eye buttons of the layers at `positions`, in this order, and expects each to be pressed. */
export async function showLayers(panel: LayerPanel, ...positions: readonly Position[]): Promise<void> {
  for (const position of positions) {
    await panel.at(position).eye.click()
    await expectShown(panel.at(position), layerAt(position).title, true)
  }
}

/** Expects the opacity slider of `layer` to read `text`, as in "35 %", next to it. */
export async function expectOpacity(layer: LayerEntry, text: string): Promise<void> {
  await expect(layer.slider).toHaveAttribute('aria-valuetext', text)
  await expect(layer.group.getByText(text, { exact: true })).toBeVisible()
}

/** Expects the map to request GetMap tiles of the layer at `position`. `since` is the number of requests made before. */
export async function expectGetMapOf(wms: WmsServers, position: Position, since = 0): Promise<void> {
  await expect.poll(() => requestsOf(wms.requests.slice(since), 'getMap', position).length).toBeGreaterThan(0)
}

// The colours of the map at C.

// Colour levels a colour may move by and stay the same: the bbox rectangle's
// faint fill tints what lies under it by up to 16 levels.
const COLOUR_TOLERANCE = 20

/** Whether two colours look the same. */
export function sameColour(a: Colour, b: Colour): boolean {
  return a.every((level, channel) => Math.abs(level - (b[channel] ?? NaN)) <= COLOUR_TOLERANCE)
}

/** Whether `colour` lies between `a` and `b`, and is neither. */
function isMix(colour: Colour, a: Colour, b: Colour): boolean {
  const between = colour.every((level, channel) => {
    const [low, high] = [a[channel] ?? NaN, b[channel] ?? NaN].sort((x, y) => x - y)
    return level >= (low ?? NaN) - COLOUR_TOLERANCE && level <= (high ?? NaN) + COLOUR_TOLERANCE
  })
  return between && !sameColour(colour, a) && !sameColour(colour, b)
}

// The map fades tiles in, and redraws a frame after the page changes: give it time.
const REDRAW_TIMEOUT = { timeout: 10_000 }

/** The colour of the map at C now. */
export async function colourAtC(page: Page, c: Point): Promise<Colour> {
  return colourAt(await takeMapPicture(page, c))
}

/** Expects the map at C to be of `colour`. */
export async function expectColourAtC(page: Page, c: Point, colour: Colour): Promise<void> {
  await expect(async () => {
    const shown = await colourAtC(page, c)
    expect(sameColour(shown, colour), `the map at C is ${shown.join(', ')}, not ${colour.join(', ')}`).toBe(true)
  }).toPass(REDRAW_TIMEOUT)
}

/** Expects the map at C to be a mix of `a` and `b`, neither of them. */
export async function expectMixAtC(page: Page, c: Point, a: Colour, b: Colour): Promise<void> {
  await expect(async () => {
    const shown = await colourAtC(page, c)
    expect(isMix(shown, a, b), `the map at C is ${shown.join(', ')}, not a mix of ${a.join(', ')} and ${b.join(', ')}`).toBe(
      true,
    )
  }).toPass(REDRAW_TIMEOUT)
}
