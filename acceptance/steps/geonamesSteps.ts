import type { JsonAnswer } from '../../src/domain/geonames'
import { step, type StepHandler } from '../runtime'
import {
  addressAnswer,
  CANNOT_ANSWER,
  NO_ADDRESS,
  placesAnswer,
  statusAnswer,
  type AddressRecord,
  type Answers,
  type GeoNamesService,
  type PlaceRecord,
} from './fakeGeoNames'
import { parseBbox, parseCount, parseFlag, parseLngLat } from './values'
import type { World } from './world'

/** The address GeoNames finds when a step does not give it, and the name its suggestion reads. */
export const SAINT_ANDRE = {
  record: {
    houseNumber: '4',
    street: 'Place Saint-André',
    town: 'Grenoble',
    region: 'Auvergne-Rhône-Alpes',
    countryCode: 'FR',
    position: { lng: 5.72867, lat: 45.1929 },
  },
  shownAs: '4 Place Saint-André, Grenoble',
} as const satisfies { record: AddressRecord; shownAs: string }

// The address search answers only for these countries; a step names them in French.
const COUNTRY_CODES: Readonly<Record<string, string>> = {
  France: 'FR',
  Suisse: 'CH',
  Espagne: 'ES',
  Autriche: 'AT',
  'Pays-Bas': 'NL',
  'États-Unis': 'US',
}

// How GeoNames refuses each search in the QA procedures: credits exhausted, and an account not enabled.
const REFUSALS: Readonly<Record<GeoNamesService, JsonAnswer>> = {
  places: statusAnswer(18, 'the daily limit of 20000 credits for carto-test has been exceeded'),
  address: statusAnswer(10, 'user account not enabled to use the free webservice'),
}

const NO_RESULT = statusAnswer(15, 'no result found')

function place(name: string, details: Partial<PlaceRecord> = {}): PlaceRecord {
  return {
    name,
    featureClass: 'P',
    featureCode: 'PPL',
    region: 'Auvergne-Rhône-Alpes',
    country: 'France',
    position: { lng: 5.71667, lat: 45.16667 },
    ...details,
  }
}

function numberedPlaces(count: number): readonly PlaceRecord[] {
  return Array.from({ length: count }, (_, index) => place(`Lieu ${index + 1}`))
}

/** GeoNames finds `places` and `address` for every search. */
function finding(places: readonly PlaceRecord[], address?: AddressRecord): Answers {
  return { places: () => placesAnswer(places), address: () => (address ? addressAnswer(address) : NO_ADDRESS) }
}

function find(world: World, places: readonly PlaceRecord[], address?: AddressRecord): void {
  world.geonames.answerWith(finding(places, address))
  world.foundPlaces = places.map((each) => each.name)
}

function countryCode(country: string): string {
  const code = COUNTRY_CODES[country]
  if (code === undefined) throw new Error(`the address search covers no country named "${country}"`)
  return code
}

function service(text: string): GeoNamesService {
  return parseFlag(text, 'GeoNames service', 'places', 'address') ? 'places' : 'address'
}

export const GEONAMES_STEPS: readonly StepHandler<World>[] = [
  step(/^GeoNames (.+) the (\S+) search$/, ({ geonames }, [failure = '', name = '']) => {
    const refuses = parseFlag(failure, 'GeoNames failure', 'refuses', 'cannot answer')
    const failing = service(name)
    const answer = refuses ? REFUSALS[failing] : CANNOT_ANSWER
    geonames.answerWith({ ...geonames.answers(), [failing]: () => answer })
  }),

  step(/^GeoNames answers every search with the status 15, no result found$/, ({ geonames }) => {
    geonames.answerWith({ places: () => NO_RESULT, address: () => NO_RESULT })
  }),

  step(/^GeoNames cannot answer any search$/, ({ geonames }) => {
    geonames.answerWith({ places: () => CANNOT_ANSWER, address: () => CANNOT_ANSWER })
  }),

  step(/^GeoNames can answer again, and finds the place (.+)$/, (world, [name = '']) => {
    find(world, [place(name)])
  }),

  step(/^GeoNames finds (a place|an address) at (.+)$/, (world, [kind = '', position = '']) => {
    const at = parseLngLat(position, 'position')
    if (kind === 'a place') find(world, [place('Grenoble', { position: at })])
    else find(world, [], { ...SAINT_ANDRE.record, position: at })
  }),

  step(/^GeoNames finds a place with the extent (.+)$/, (world, [extent = '']) => {
    find(world, [place('Grenoble', { extent: parseBbox(extent, 'extent') })])
  }),

  step(
    /^GeoNames finds the place (.+?)(?: of class (\S+) and code (\S+) in ([^,]*), ([^,]+))?$/,
    (world, [name = '', featureClass, featureCode, region, country]) => {
      const details = featureClass === undefined ? {} : { featureClass, featureCode, region, country }
      find(world, [place(name, details)])
    },
  ),

  step(/^GeoNames finds the places (.+)$/, (world, [names = '']) => {
    find(world, names.split(', ').map((name) => place(name)))
  }),

  step(/^GeoNames finds (\S+) places$/, (world, [count = '']) => {
    find(world, numberedPlaces(parseCount(count, 'place count')))
  }),

  step(/^GeoNames finds (\S+) places and an address$/, (world, [count = '']) => {
    find(world, numberedPlaces(parseCount(count, 'place count')), SAINT_ANDRE.record)
  }),

  step(/^GeoNames finds (\S+) places and one more, and no address$/, (world, [count = '']) => {
    find(world, numberedPlaces(parseCount(count, 'place count') + 1))
  }),

  step(/^GeoNames finds no place and no address$/, (world) => {
    find(world, [])
  }),

  step(
    /^GeoNames finds the address (\S+) ([^,]+), ([^,]+) in ([^,]*), ([^,]+)$/,
    (world, [houseNumber = '', street = '', town = '', region = '', country = '']) => {
      const address = { houseNumber, street, town, region, countryCode: countryCode(country), position: SAINT_ANDRE.record.position }
      find(world, [], address)
    },
  ),

  step(/^GeoNames answers each search only when told to$/, ({ geonames }) => {
    geonames.hold()
  }),

  step(/^GeoNames answers the search for (.+?)(?: with the place (.+))?$/, async ({ geonames }, [text = '', name]) => {
    await geonames.release(text, name === undefined ? geonames.answers() : finding([place(name)]))
  }),
]
