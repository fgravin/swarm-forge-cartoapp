import { expect, test, type Locator } from '@playwright/test'

import { answersFor, finding, searchedTexts, type GeoNamesRequest, type GeoNamesService } from './geonames'
import { boxOf, liesInside, overlaps, tabUntilFocused, type Box } from './mapScreen'
import {
  expectListClosed,
  expectNoMessage,
  expectSuggestions,
  openSearch,
  pause,
  SEARCH_NAME,
  searchFor,
  typeSlowly,
} from './searchBox'

// Executable form of qa/procedures/place-search-query.md.

const GEONAMES = 'https://secure.geonames.org'
const VIEWPORT: Box = { x: 0, y: 0, width: 1280, height: 720 }

/** Expects exactly one search, for each of `texts` in turn: a places search and an address search. */
function expectSearches(requests: readonly GeoNamesRequest[], texts: readonly string[]): void {
  expect(searchedTexts(requests, 'places'), 'places searches').toEqual(texts)
  expect(searchedTexts(requests, 'address'), 'address searches').toEqual(texts)
  expect(requests, 'requests to GeoNames').toHaveLength(2 * texts.length)
}

/** The URL of the request to `service`. */
function urlOf(requests: readonly GeoNamesRequest[], service: GeoNamesService): URL {
  const request = requests.find((made) => made.service === service)
  if (request === undefined) throw new Error(`No ${service} search.`)
  return request.url
}

test('place-search-query 1: a search is made once the user has stopped typing', async ({ page }) => {
  const { search, geonames } = await openSearch(page)
  await search.field.click()

  const lastKey = await typeSlowly(page, 'Grenoble')

  await page.waitForTimeout(1000 - (Date.now() - lastKey))
  const startedAfter = geonames.requests.map((request) => request.at - lastKey)
  expect(Math.min(...startedAfter), 'milliseconds from the last key to the first search').toBeGreaterThanOrEqual(250)
  expect(Math.max(...startedAfter), 'milliseconds from the last key to the last search').toBeLessThanOrEqual(1000)
  expectSearches(geonames.requests, ['Grenoble'])

  const places = urlOf(geonames.requests, 'places')
  expect(`${places.origin}${places.pathname}`).toBe(`${GEONAMES}/searchJSON`)
  expect(Object.fromEntries(places.searchParams)).toEqual({
    name_startsWith: 'Grenoble',
    orderby: 'relevance',
    maxRows: '8',
    lang: 'fr',
    inclBbox: 'true',
    username: 'carto-qa',
  })
  const address = urlOf(geonames.requests, 'address')
  expect(`${address.origin}${address.pathname}`).toBe(`${GEONAMES}/geoCodeAddressJSON`)
  expect(Object.fromEntries(address.searchParams)).toEqual({ q: 'Grenoble', username: 'carto-qa' })
})

test('place-search-query 2: a search needs at least 3 characters', async ({ page }) => {
  const { search, geonames } = await openSearch(page)

  await searchFor(page, search, 'Gr')
  expectSearches(geonames.requests, [])
  await expect(search.field).not.toHaveAttribute('aria-expanded', 'true')

  await typeSlowly(page, 'e')
  await pause(page)
  expectSearches(geonames.requests, ['Gre'])
  await expectSuggestions(search, ['Grenoble'])
})

test('place-search-query 3: erasing below 3 characters closes the suggestion list', async ({ page }) => {
  const { search, geonames } = await openSearch(page)
  await searchFor(page, search, 'Gre')
  await expectSuggestions(search, ['Grenoble'])

  await page.keyboard.press('Backspace')
  await pause(page)

  await expectListClosed(search)
  await expectNoMessage(search)
  expectSearches(geonames.requests, ['Gre'])
})

const GRECE = {
  name: 'Grèce',
  fcl: 'A',
  fcode: 'PCLI',
  adminName1: '',
  countryName: 'Grèce',
  lat: '39',
  lng: '22',
}

test('place-search-query 4: a late answer to an earlier text is ignored', async ({ page }) => {
  const { search, geonames } = await openSearch(page, answersFor('Gre', finding([GRECE])))
  const letThrough = geonames.hold('Gre')
  await searchFor(page, search, 'Gre')

  await typeSlowly(page, 'n')
  await pause(page)
  await expectSuggestions(search, ['Grenoble'])

  expectSearches(geonames.requests, ['Gre', 'Gren'])

  letThrough()
  await page.waitForTimeout(1000)

  await expectSuggestions(search, ['Grenoble'])
  await expect(search.option('Grèce')).toHaveCount(0)
})

test('place-search-query 5: a late answer is ignored once the search field holds less than 3 characters', async ({
  page,
}) => {
  const { search, geonames } = await openSearch(page)
  const letThrough = geonames.hold('Gre')
  await searchFor(page, search, 'Gre')

  await page.keyboard.press('Backspace')
  await pause(page)
  expectSearches(geonames.requests, ['Gre'])

  letThrough()
  await page.waitForTimeout(1000)

  await expectListClosed(search)
  await expectNoMessage(search)
})

// Clear of the rounded corners, which take no pointer events.
const INSET = 8

/** Points spread over `box`, inside its edges, relative to its top left corner. */
function pointsOver(box: Box): readonly { x: number; y: number }[] {
  const xs = [INSET, box.width / 4, box.width / 2, (3 * box.width) / 4, box.width - INSET]
  const ys = [INSET, box.height / 2, box.height - INSET]
  return xs.flatMap((x) => ys.map((y) => ({ x, y })))
}

/**
 * Expects `list` to be what the mouse reaches all over it: no part of it lies
 * behind another element. Playwright's actionability check fails when the
 * point of an action is covered.
 */
async function expectDrawnOnTop(list: Locator): Promise<void> {
  for (const position of pointsOver(await boxOf(list))) {
    await list.hover({ position, trial: true, timeout: 2000 })
  }
}

test('place-search-query 6: the search field sits in the header and follows the combobox pattern', async ({
  page,
}) => {
  const { screen, search } = await openSearch(page)

  const header = await boxOf(page.getByRole('banner'))
  const title = await boxOf(screen.header)
  const field = await boxOf(search.field)
  expect(liesInside(field, header), 'the search field lies inside the header').toBe(true)
  expect(field.x, 'the search field lies right of the title').toBeGreaterThanOrEqual(title.x + title.width)
  expect(overlaps(field, title), 'the search field covers the title').toBe(false)

  await expect(search.field).toBeEnabled()
  await expect(search.field).toHaveValue('')
  await expect(search.field).toHaveAttribute('placeholder', SEARCH_NAME)
  await expect(search.field).toHaveAttribute('aria-expanded', 'false')

  await tabUntilFocused(page, search.field)
  await typeSlowly(page, 'Gre')
  await pause(page)
  await expect(search.field).toHaveAttribute('aria-expanded', 'true')
  const listId = await search.list.getAttribute('id')
  expect(listId).toBeTruthy()
  await expect(search.field).toHaveAttribute('aria-controls', listId ?? '')

  const list = await boxOf(search.list)
  expect(liesInside(list, VIEWPORT), 'the suggestion list lies inside the window').toBe(true)
  expect(overlaps(list, await boxOf(screen.map)), 'the suggestion list opens over the map').toBe(true)
  await expectDrawnOnTop(search.list)
})
