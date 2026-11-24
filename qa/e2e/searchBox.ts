import { expect, type Locator, type Page } from '@playwright/test'

import { answerGeoNames, USUAL_ANSWERS, type GeoNamesAnswers, type GeoNamesServer } from './geonames'
import { boxOf, goToMap, type MapScreen } from './mapScreen'
import { serveTilesLocally } from './tiles'

// The search field of the header, as the place search procedures describe it
// (place-search-query.md, "What the user sees").

export const SEARCH_NAME = 'Rechercher un lieu ou une adresse'
export const UNAVAILABLE = 'Recherche indisponible'
export const NOTHING_FOUND = 'Aucun résultat'

/** "To type T is to type it one key at a time, 100 ms apart." */
const KEY_INTERVAL_MS = 100
/** "To pause is to wait one second without typing." */
const PAUSE_MS = 1000
// "Right under the search field": the gap the layout leaves, in pixels.
const UNDER_GAP = 12

/** What the user sees of the place search, found by role, accessible name, and visible text. */
export interface SearchBox {
  /** The combobox of the header. */
  readonly field: Locator
  /** The suggestion list, while it is shown. */
  readonly list: Locator
  /** Every suggestion on the page. */
  readonly options: Locator
  /** The suggestion named `name`. */
  option(name: string): Locator
  /** The status under the search field, which shows a message in place of the list. */
  readonly message: Locator
  readonly clearButton: Locator
}

export function searchBox(page: Page): SearchBox {
  const options = page.getByRole('option')
  return {
    field: page.getByRole('combobox', { name: SEARCH_NAME, exact: true }),
    list: page.getByRole('listbox'),
    options,
    option: (name) => options.filter({ has: page.getByText(name, { exact: true }) }),
    message: page.getByRole('banner').getByRole('status'),
    clearButton: page.getByRole('button', { name: 'Effacer', exact: true }),
  }
}

/** The application, open, with its tile and GeoNames requests answered locally. */
export interface OpenSearch {
  readonly screen: MapScreen
  readonly search: SearchBox
  /** The tile requests. */
  readonly requested: readonly string[]
  readonly geonames: GeoNamesServer
}

/** Opens the application at `at`, with GeoNames giving `answers`, and waits until the map asks for tiles. */
export async function openSearch(page: Page, answers: GeoNamesAnswers = USUAL_ANSWERS, at = '/'): Promise<OpenSearch> {
  const requested = await serveTilesLocally(page)
  // Playwright tries the routes last registered first: GeoNames is answered here, not as a tile.
  const geonames = await answerGeoNames(page, answers)
  const screen = await goToMap(page, requested, at)
  return { screen, search: searchBox(page), requested, geonames }
}

/** "Type T": types `text` into what has the focus. Returns when the last key was pressed. */
export async function typeSlowly(page: Page, text: string): Promise<number> {
  for (const [index, key] of [...text].entries()) {
    if (index > 0) await page.waitForTimeout(KEY_INTERVAL_MS)
    await page.keyboard.type(key)
  }
  return Date.now()
}

/** "Pause." */
export async function pause(page: Page): Promise<void> {
  await page.waitForTimeout(PAUSE_MS)
}

/** "Click the search field, type T and pause." */
export async function searchFor(page: Page, search: SearchBox, text: string): Promise<void> {
  await search.field.click()
  await typeSlowly(page, text)
  await pause(page)
}

/** Expects the suggestion list to be closed: `aria-expanded` is false, and there is no option on the page. */
export async function expectListClosed(search: SearchBox): Promise<void> {
  await expect(search.field).toHaveAttribute('aria-expanded', 'false')
  await expect(search.options).toHaveCount(0)
}

/** Expects `text` right under the search field, as a status, and no option on the page. */
export async function expectMessage(search: SearchBox, text: string): Promise<void> {
  await expect(search.message).toHaveText(text)
  await expect(search.options).toHaveCount(0)
  const field = await boxOf(search.field)
  const shown = await boxOf(search.message.getByText(text, { exact: true }))
  expect(Math.abs(shown.x - field.x), 'left edge against the search field').toBeLessThanOrEqual(1)
  expect(shown.y - (field.y + field.height), 'gap under the search field').toBeGreaterThanOrEqual(0)
  expect(shown.y - (field.y + field.height), 'gap under the search field').toBeLessThanOrEqual(UNDER_GAP)
}

/** Expects no message under the search field. */
export async function expectNoMessage(search: SearchBox): Promise<void> {
  await expect(search.message).toHaveText('')
}

/** Expects the suggestion list to be open and to show the suggestions named `names`, in this order. */
export async function expectSuggestions(search: SearchBox, names: readonly string[]): Promise<void> {
  await expect(search.field).toHaveAttribute('aria-expanded', 'true')
  await expect(search.options).toHaveCount(names.length)
  for (const [index, name] of names.entries()) {
    await expect(search.options.nth(index).getByText(name, { exact: true })).toBeVisible()
  }
}
