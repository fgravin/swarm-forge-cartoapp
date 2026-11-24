import { expect, test } from '@playwright/test'

import { expectBboxShown } from './bbox'
import {
  answersFor,
  statusAnswer,
  USUAL_ANSWERS,
  type GeoNamesAnswer,
  type GeoNamesAnswers,
  type GeoNamesService,
} from './geonames'
import { expectOnlySelected, expectTilesFromEveryServer, steadyText } from './mapScreen'
import { dragOnMap, mapCentre, offset } from './pointer'
import {
  expectMessage,
  expectNoMessage,
  expectSuggestions,
  NOTHING_FOUND,
  openSearch,
  pause,
  searchFor,
  typeSlowly,
  UNAVAILABLE,
} from './searchBox'

// Executable form of qa/procedures/place-search-availability.md.

const ABORTED: GeoNamesAnswer = { kind: 'aborted' }

interface FailureRow {
  readonly name: string
  readonly service: GeoNamesService
  readonly answer: GeoNamesAnswer
}

const FAILURES: readonly FailureRow[] = [
  {
    name: 'places: the daily limit is exceeded',
    service: 'places',
    answer: statusAnswer(
      18,
      'the daily limit of 20000 credits for carto-qa has been exceeded. Please throttle your requests or use the commercial service.',
    ),
  },
  {
    name: 'address: the account is not enabled',
    service: 'address',
    answer: statusAnswer(
      10,
      'user account not enabled to use the free webservice. Please enable it on your account page: https://www.geonames.org/manageaccount ',
    ),
  },
  { name: 'places: the connection is aborted', service: 'places', answer: ABORTED },
  { name: 'address: HTTP 503', service: 'address', answer: { kind: 'empty', status: 503 } },
]

/** The search of `failing` gets `answer`; the other search gets its usual answer. */
function failingOnly({ service: failing, answer }: FailureRow): GeoNamesAnswers {
  return (service, text) => (service === failing ? answer : USUAL_ANSWERS(service, text))
}

test.describe('place-search-availability 1: a search that GeoNames cannot answer or refuses is unavailable', () => {
  for (const failure of FAILURES) {
    test(failure.name, async ({ page }) => {
      const { screen, search, requested } = await openSearch(page, failingOnly(failure))
      const view = await steadyText(screen.viewIndicator)

      await searchFor(page, search, 'Gre')
      await expectMessage(search, UNAVAILABLE)

      const c = await mapCentre(screen)
      await dragOnMap(page, c, offset(c, 100, 0))
      await expect(screen.viewIndicator).not.toHaveText(view)

      const since = requested.length
      await screen.basemap('World Imagery').click()
      await expectOnlySelected(screen, 'World Imagery')
      await expectTilesFromEveryServer('World Imagery', requested, since)

      await screen.drawButton.click()
      await dragOnMap(page, offset(c, -100, -100), offset(c, 100, 100))
      await expectBboxShown(screen)
    })
  }
})

test('place-search-availability 2: the status 15 means that GeoNames found nothing', async ({ page }) => {
  const { search } = await openSearch(page, () => statusAnswer(15, 'no result found'))

  await searchFor(page, search, 'Gre')

  await expectMessage(search, NOTHING_FOUND)
  await expect(search.message).not.toContainText(UNAVAILABLE)
})

test('place-search-availability 3: a later search that GeoNames answers shows its suggestions', async ({ page }) => {
  const { search } = await openSearch(page, answersFor('Gre', () => ABORTED))

  await searchFor(page, search, 'Gre')
  await expectMessage(search, UNAVAILABLE)

  await typeSlowly(page, 'n')
  await pause(page)

  await expectSuggestions(search, ['Grenoble'])
  await expectNoMessage(search)
})
