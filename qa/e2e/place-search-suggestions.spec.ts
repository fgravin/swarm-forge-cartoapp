import { expect, test } from '@playwright/test'

import {
  finding,
  NO_PLACE,
  SAINT_ANDRE,
  town,
  type GeoNamesAnswer,
  type GeoNamesAnswers,
  type Place,
} from './geonames'
import { expectMessage, expectSuggestions, NOTHING_FOUND, openSearch, searchFor, type SearchBox } from './searchBox'

// Executable form of qa/procedures/place-search-suggestions.md.

/** Expects the suggestion list to show one suggestion per row of `readings`, each read as its row says, in order. */
async function expectReadings(search: SearchBox, readings: readonly (readonly string[])[]): Promise<void> {
  await expect(search.options).toHaveCount(readings.length)
  for (const [index, reading] of readings.entries()) {
    await expect(search.options.nth(index)).toHaveAccessibleName(reading.filter((part) => part !== '').join(' '))
  }
}

interface PlaceRow {
  readonly text: string
  readonly place: Omit<Place, 'lat' | 'lng'>
  readonly type: string
  readonly context: string
}

function row(
  text: string,
  [name, toponymName, fcl, fcode, adminName1, countryName]: readonly [string, string, string, string, string, string],
  type: string,
  context: string,
): PlaceRow {
  return { text, place: { name, toponymName, fcl, fcode, adminName1, countryName }, type, context }
}

// The Name column reads the `name` column on every row.
const PLACE_ROWS: readonly PlaceRow[] = [
  row('Gre', ['Grenoble', 'Grenoble', 'P', 'PPLA3', 'Auvergne-Rhône-Alpes', 'France'], 'Ville', 'Auvergne-Rhône-Alpes, France'),
  row('Isè', ['Isère', 'Isère', 'A', 'ADM2', 'Auvergne-Rhône-Alpes', 'France'], 'Région', 'Auvergne-Rhône-Alpes, France'),
  row('Auv', ['Auvergne-Rhône-Alpes', 'Auvergne-Rhône-Alpes', 'A', 'ADM1', 'Auvergne-Rhône-Alpes', 'France'], 'Région', 'France'),
  row('Grè', ['Grèce', 'Hellenic Republic', 'A', 'PCLI', '', 'Grèce'], 'Pays', ''),
  row('Nou', ['Nouvelle-Calédonie', 'New Caledonia', 'A', 'PCLD', '', 'Nouvelle-Calédonie'], 'Pays', ''),
  row('Mon', ['Mont Blanc', 'Mont Blanc', 'T', 'MT', 'Auvergne-Rhône-Alpes', 'France'], 'Lieu', 'Auvergne-Rhône-Alpes, France'),
  row('Lac', ['Lac Léman', 'Lake Geneva', 'H', 'LK', 'Genève', 'Suisse'], 'Lieu', 'Genève, Suisse'),
  row('Lon', ['Londres', 'London', 'P', 'PPLC', 'England', 'Royaume-Uni'], 'Ville', 'England, Royaume-Uni'),
]

test.describe("place-search-suggestions 1: a place suggestion gives the place's name, type and context", () => {
  for (const { text, place, type, context } of PLACE_ROWS) {
    test(`${text}: ${place.name}`, async ({ page }) => {
      const { search } = await openSearch(page, finding([{ ...place, lat: '45', lng: '5' }]))

      await searchFor(page, search, text)

      await expectReadings(search, [[place.name, type, context]])
    })
  }
})

const SAINT_ANDRE_READING = ['4 Place Saint-André, Grenoble', 'Adresse', 'Auvergne-Rhône-Alpes, France'] as const

test('place-search-suggestions 2: an address suggestion gives the address, its type and its context', async ({
  page,
}) => {
  const { search } = await openSearch(page, (service) => (service === 'places' ? NO_PLACE : SAINT_ANDRE))

  await searchFor(page, search, '4 place Saint-André Grenoble')

  await expectReadings(search, [SAINT_ANDRE_READING])
})

const EIGHT_PLACES = [
  'Grenoble',
  'Grésy-sur-Aix',
  'Gréoux-les-Bains',
  'Grenade',
  'Greenwich',
  'Grenchen',
  'Gresse-en-Vercors',
  'Grez-Doiceau',
] as const

/** The places search finds towns named `names`, in this order, and the address search gets `address`. */
function placesNamed(names: readonly string[], address?: GeoNamesAnswer): GeoNamesAnswers {
  return finding(names.map((name) => town(name)), address)
}

test('place-search-suggestions 3: the address comes first, within 8 suggestions', async ({ page }) => {
  const { search } = await openSearch(page, placesNamed(EIGHT_PLACES, SAINT_ANDRE))

  await searchFor(page, search, 'Gre')

  await expectSuggestions(search, [SAINT_ANDRE_READING[0], ...EIGHT_PLACES.slice(0, 7)])
  await expect(search.options.first()).toHaveAccessibleName(SAINT_ANDRE_READING.join(' '))
  await expect(search.option('Grez-Doiceau')).toHaveCount(0)
})

test('place-search-suggestions 4: the list shows 8 places at most', async ({ page }) => {
  const { search } = await openSearch(page, placesNamed([...EIGHT_PLACES, 'Grézieu-la-Varenne']))

  await searchFor(page, search, 'Gre')

  await expectSuggestions(search, EIGHT_PLACES)
  await expect(search.option('Grézieu-la-Varenne')).toHaveCount(0)
})

test('place-search-suggestions 5: the search says so when GeoNames finds nothing', async ({ page }) => {
  const { search } = await openSearch(page, finding([]))

  await searchFor(page, search, 'Gre')

  await expectMessage(search, NOTHING_FOUND)
})
