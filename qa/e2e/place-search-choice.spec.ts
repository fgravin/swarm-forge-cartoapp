import { expect, test, type Page } from '@playwright/test'

import { drawBbox } from './bbox'
import { finding, GRE_PLACES, SAINT_ANDRE, USUAL_ANSWERS, type GeoNamesAnswers, type Place } from './geonames'
import { expectOnlySelected, steadyText, tabUntilFocused, type MapScreen } from './mapScreen'
import { mapCentre, offset } from './pointer'
import { expectListClosed, expectSuggestions, openSearch, pause, searchFor, typeSlowly, type SearchBox } from './searchBox'

// Executable form of qa/procedures/place-search-choice.md.

const GRENOBLE_VIEW = '45.1667° N, 5.7167° E · zoom 12.0'
// The map may fly there: from zoom 5 to zoom 17, the flight takes a few seconds.
const FLIGHT_TIMEOUT = 15_000

/** "Expect the view indicator to read `text`", once it stops changing. */
async function expectViewReads(screen: MapScreen, text: string): Promise<void> {
  await expect(screen.viewIndicator).toHaveText(text, { timeout: FLIGHT_TIMEOUT })
  expect(await steadyText(screen.viewIndicator)).toBe(text)
}

/** "Using only the keyboard, press Tab until the search field has the focus. Type T and pause." */
async function searchByKeyboard(page: Page, search: SearchBox, text: string): Promise<void> {
  await tabUntilFocused(page, search.field)
  await typeSlowly(page, text)
  await pause(page)
}

const ADDRESS_TEXT = '4 place Saint-André Grenoble'

interface CentreRow {
  readonly text: string
  readonly suggestion: string
  readonly view: string
}

const CENTRE_ROWS: readonly CentreRow[] = [
  { text: 'Gre', suggestion: 'Grenoble', view: GRENOBLE_VIEW },
  { text: ADDRESS_TEXT, suggestion: '4 Place Saint-André, Grenoble', view: '45.1929° N, 5.7287° E · zoom 17.0' },
]

/** The usual answers, and the address search for 4 place Saint-André Grenoble finds it. */
const SAINT_ANDRE_FOUND: GeoNamesAnswers = (service, text) =>
  service === 'address' && text === ADDRESS_TEXT ? SAINT_ANDRE : USUAL_ANSWERS(service, text)

test.describe('place-search-choice 1: choosing a suggestion without an extent centres the map on it', () => {
  for (const row of CENTRE_ROWS) {
    test(row.suggestion, async ({ page }) => {
      const { screen, search } = await openSearch(page, SAINT_ANDRE_FOUND)

      await searchFor(page, search, row.text)
      await search.option(row.suggestion).click()

      await expectViewReads(screen, row.view)
    })
  }
})

/** Degrees north and east, and a zoom. */
interface View {
  readonly lat: number
  readonly lng: number
  readonly zoom: number
}

const VIEW_TEXT = /^(\d+\.\d+)° ([NS]), (\d+\.\d+)° ([EW]) · zoom (\d+\.\d)$/

function readView(text: string): View {
  const [, lat, ns, lng, ew, zoom] = VIEW_TEXT.exec(text) ?? []
  if (zoom === undefined) throw new Error(`The view indicator reads "${text}".`)
  return {
    lat: Number(lat) * (ns === 'S' ? -1 : 1),
    lng: Number(lng) * (ew === 'W' ? -1 : 1),
    zoom: Number(zoom),
  }
}

type Range = readonly [number, number]

interface ExtentRow {
  readonly text: string
  readonly place: Place
  readonly lat: Range
  readonly lng: Range
  readonly zoom: Range
}

function region(name: string, bbox: Place['bbox'], countryName: string, lat: string, lng: string): Place {
  return { name, fcl: 'A', fcode: 'ADM2', adminName1: '', countryName, lat, lng, bbox }
}

// South is negative, as GeoNames writes it.
const EXTENT_ROWS: readonly ExtentRow[] = [
  {
    text: 'Isè',
    place: region('Isère', ['4.74', '44.70', '6.36', '45.88'], 'France', '45.25', '5.58'),
    lat: [45.25, 45.35],
    lng: [5.5, 5.6],
    zoom: [7.0, 8.2],
  },
  {
    text: 'Fid',
    place: { ...region('Fidji', ['177.12', '-20.68', '-178.42', '-12.48'], 'Fidji', '-18', '178'), fcode: 'PCLI' },
    lat: [-16.9, -16.3],
    lng: [179.0, 179.7],
    zoom: [5.0, 6.0],
  },
]

function expectWithin(value: number, [low, high]: Range, what: string): void {
  expect(value, what).toBeGreaterThanOrEqual(low)
  expect(value, what).toBeLessThanOrEqual(high)
}

test.describe('place-search-choice 2: choosing a suggestion with an extent shows that extent', () => {
  for (const row of EXTENT_ROWS) {
    test(row.place.name, async ({ page }) => {
      const { screen, search } = await openSearch(page, finding([row.place]))
      const before = await steadyText(screen.viewIndicator)

      await searchFor(page, search, row.text)
      await search.option(row.place.name).click()

      await expect(screen.viewIndicator).not.toHaveText(before)
      const text = await steadyText(screen.viewIndicator)
      const view = readView(text)
      expectWithin(view.lat, row.lat, `the latitude of ${text}`)
      expectWithin(view.lng, row.lng, `the longitude of ${text}`)
      expectWithin(view.zoom, row.zoom, `the zoom of ${text}`)
    })
  }
})

test('place-search-choice 3: a chosen suggestion fills the search field and closes the list', async ({ page }) => {
  const { search, geonames } = await openSearch(page)
  await searchFor(page, search, 'Gre')

  const searches = geonames.requests.length
  await search.option('Grenoble').click()
  await pause(page)

  await expect(search.field).toHaveValue('Grenoble')
  await expectListClosed(search)
  expect(geonames.requests).toHaveLength(searches)
})

/** Expects `name` to be the active suggestion, and the focus to stay in the search field. */
async function expectActive(page: Page, search: SearchBox, name: string): Promise<void> {
  await expect(search.field).toBeFocused()
  const active = search.option(name)
  await expect(active).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('option', { selected: true })).toHaveCount(1)
  await expect(search.field).toHaveAttribute('aria-activedescendant', (await active.getAttribute('id')) ?? '')

  const background = (option: typeof active): Promise<string> =>
    option.evaluate((element) => getComputedStyle(element).backgroundColor)
  const highlight = await background(active)
  for (const option of await search.options.all()) {
    if ((await option.getAttribute('aria-selected')) !== 'true') {
      expect(await background(option), `${name} is highlighted`).not.toBe(highlight)
    }
  }
}

interface ArrowRow {
  readonly down: number
  readonly up: number
  readonly active: string
}

const ARROW_ROWS: readonly ArrowRow[] = [
  { down: 1, up: 0, active: 'Grenoble' },
  { down: 3, up: 0, active: 'Grèce' },
  { down: 4, up: 0, active: 'Grenoble' },
  { down: 0, up: 1, active: 'Grèce' },
  { down: 2, up: 1, active: 'Grenoble' },
  { down: 1, up: 1, active: 'Grèce' },
]

async function press(page: Page, key: string, times: number): Promise<void> {
  for (let pressed = 0; pressed < times; pressed++) await page.keyboard.press(key)
}

test.describe('place-search-choice 4: the arrow keys move the active suggestion round the list', () => {
  for (const row of ARROW_ROWS) {
    test(`down ${row.down}, up ${row.up}: ${row.active}`, async ({ page }) => {
      const { screen, search } = await openSearch(page, finding(GRE_PLACES))
      const view = await steadyText(screen.viewIndicator)
      await searchByKeyboard(page, search, 'Gre')

      await press(page, 'ArrowDown', row.down)
      await press(page, 'ArrowUp', row.up)

      await expectActive(page, search, row.active)
      expect(await steadyText(screen.viewIndicator)).toBe(view)
    })
  }
})

test('place-search-choice 5: Enter chooses the active suggestion', async ({ page }) => {
  const { screen, search } = await openSearch(page, finding(GRE_PLACES))
  await searchByKeyboard(page, search, 'Gre')

  await press(page, 'ArrowDown', 2)
  await page.keyboard.press('Enter')

  await expect(search.field).toHaveValue('Grésy-sur-Aix')
  await expect(search.field).toHaveAttribute('aria-expanded', 'false')
  await expectViewReads(screen, '45.7206° N, 5.9283° E · zoom 12.0')
})

test('place-search-choice 6: Enter chooses nothing while no suggestion is active', async ({ page }) => {
  const { screen, search } = await openSearch(page, finding(GRE_PLACES))
  const view = await steadyText(screen.viewIndicator)

  await searchFor(page, search, 'Gre')
  await page.keyboard.press('Enter')

  await expectSuggestions(search, GRE_PLACES.map((place) => place.name))
  await expect(page.getByRole('option', { selected: true })).toHaveCount(0)
  await expect(search.field).toHaveValue('Gre')
  expect(await steadyText(screen.viewIndicator)).toBe(view)
})

test('place-search-choice 7: Escape closes the suggestion list', async ({ page }) => {
  const { screen, search } = await openSearch(page)
  const view = await steadyText(screen.viewIndicator)

  await searchFor(page, search, 'Gre')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')

  await expectListClosed(search)
  await expect(search.field).toHaveValue('Gre')
  expect(await steadyText(screen.viewIndicator)).toBe(view)
})

test('place-search-choice 8: choosing a suggestion keeps the basemap and the bbox', async ({ page }) => {
  const { screen, search } = await openSearch(page)
  await screen.basemap('World Imagery').click()
  const c = await mapCentre(screen)
  const bbox = await drawBbox(page, screen, offset(c, -100, -100), offset(c, 100, 100))

  await searchFor(page, search, 'Gre')
  await search.option('Grenoble').click()

  await expectViewReads(screen, GRENOBLE_VIEW)
  await expectOnlySelected(screen, 'World Imagery')
  await expect(screen.bboxText).toHaveText(bbox)
})
