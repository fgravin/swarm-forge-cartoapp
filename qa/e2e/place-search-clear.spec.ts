import { expect, test } from '@playwright/test'

import { searchedTexts } from './geonames'
import { boxOf, steadyText } from './mapScreen'
import {
  expectListClosed,
  expectNoMessage,
  expectSuggestions,
  openSearch,
  pause,
  SEARCH_NAME,
  searchFor,
  typeSlowly,
  type SearchBox,
} from './searchBox'

// Executable form of qa/procedures/place-search-clear.md.

// "Next to the search field": the gap the layout leaves, in pixels.
const BESIDE_GAP = 16

/** Expects the search field to be empty, showing what it is for. */
async function expectEmptyField(search: SearchBox): Promise<void> {
  await expect(search.field).toHaveValue('')
  await expect(search.field).toHaveAttribute('placeholder', SEARCH_NAME)
}

test('place-search-clear 1: clearing the search is offered only while the search field holds text', async ({
  page,
}) => {
  const { search } = await openSearch(page)

  await expect(search.clearButton).toHaveCount(0)

  await search.field.click()
  await typeSlowly(page, 'G')

  await expect(search.clearButton).toBeVisible()
  const field = await boxOf(search.field)
  const button = await boxOf(search.clearButton)
  const gap = button.x - (field.x + field.width)
  expect(gap, 'gap between the search field and "Effacer"').toBeGreaterThanOrEqual(0)
  expect(gap, 'gap between the search field and "Effacer"').toBeLessThanOrEqual(BESIDE_GAP)
  expect(Math.abs(button.y + button.height / 2 - (field.y + field.height / 2)), 'level with the field').toBeLessThan(4)
})

test('place-search-clear 2: clearing the search empties the field and closes the list without moving the map', async ({
  page,
}) => {
  const { screen, search } = await openSearch(page)
  const view = await steadyText(screen.viewIndicator)
  await searchFor(page, search, 'Gre')
  await expectSuggestions(search, ['Grenoble'])

  await search.clearButton.click()

  await expectEmptyField(search)
  await expectListClosed(search)
  await expect(search.clearButton).toHaveCount(0)
  expect(await steadyText(screen.viewIndicator)).toBe(view)
})

test('place-search-clear 3: clearing the search before the pause makes no search', async ({ page }) => {
  const { search, geonames } = await openSearch(page)
  await search.field.click()

  const lastKey = await typeSlowly(page, 'Gre')
  await search.clearButton.click()
  expect(Date.now() - lastKey, 'milliseconds from the last key to "Effacer"').toBeLessThanOrEqual(100)
  await pause(page)

  expect(geonames.requests).toHaveLength(0)
  await expectEmptyField(search)
})

test('place-search-clear 4: clearing the search ignores the answer still to come', async ({ page }) => {
  const { search, geonames } = await openSearch(page)
  const letThrough = geonames.hold('Gre')
  await searchFor(page, search, 'Gre')

  await search.clearButton.click()
  expect(searchedTexts(geonames.requests, 'places'), 'the search held').toEqual(['Gre'])

  letThrough()
  await page.waitForTimeout(1000)

  await expectEmptyField(search)
  await expectListClosed(search)
  await expectNoMessage(search)
})
