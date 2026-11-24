import { expect } from 'vitest'

import type { SuggestionOption } from '../../src/application/usePlaceSearch'
import { step, type StepHandler } from '../runtime'
import { SAINT_ANDRE } from './geonamesSteps'
import { parseBbox, parseCount, parseFlag, parseLngLat, parseNumber, parsePosition } from './values'
import type { World } from './world'

// How long apart the user presses keys when typing, and how long a pause lasts.
const KEY_INTERVAL_MS = 100
const PAUSE_MS = 1000

/** The first `count` characters of `text`, as in "the first 3 characters of Grenoble". */
function firstCharacters(text: string, count: number): string {
  return [...text].slice(0, count).join('')
}

/** The text a step names: `text`, or its first `count` characters for "the first <count> characters of <text>". */
function namedText(count: string | undefined, text: string): string {
  return count === undefined ? text : firstCharacters(text, parseCount(count, 'character count'))
}

/** What the search field holds after each key the user presses to make it hold `goal`: erasing, then typing. */
function keystrokes(held: string, goal: string): readonly string[] {
  const from = [...held]
  const to = [...goal]
  let kept = 0
  while (kept < from.length && kept < to.length && from[kept] === to[kept]) kept += 1
  const erasing = from.slice(kept).map((_, index) => from.slice(0, from.length - index - 1).join(''))
  const typing = to.slice(kept).map((_, index) => to.slice(0, kept + index + 1).join(''))
  return [...erasing, ...typing]
}

/** Presses the keys that make the search field hold `goal`, `interval` milliseconds apart. */
async function editTo(world: World, goal: string, interval = KEY_INTERVAL_MS): Promise<void> {
  const { placeSearch } = world.screen
  for (const [index, text] of keystrokes(placeSearch.text.value, goal).entries()) {
    if (index > 0) await world.clock.pass(interval)
    placeSearch.type(text)
  }
}

async function editAndPause(world: World, goal: string): Promise<void> {
  await editTo(world, goal)
  await world.clock.pass(PAUSE_MS)
}

function heldText({ screen }: World): string {
  return screen.placeSearch.text.value
}

function options({ screen }: World): readonly SuggestionOption[] {
  return screen.placeSearch.options.value
}

/** The position, from 1, of a suggestion as a step names it. */
function suggestionPosition(text: string): number {
  return parsePosition(text, 'suggestion position')
}

/** The suggestion at `position`, from 1, which the list must show. */
function optionAt(world: World, position: number): SuggestionOption {
  const option = options(world)[position - 1]
  if (option === undefined) throw new Error(`the suggestion list shows no suggestion ${position}`)
  return option
}

function notedOption(world: World): SuggestionOption {
  if (world.notedSuggestion === undefined) throw new Error('no suggestion was named in an earlier step')
  return optionAt(world, world.notedSuggestion)
}

/** The list is open and shows suggestions named `names`, in this order, and no message. */
function expectSuggestions(world: World, names: readonly string[]): void {
  const { placeSearch } = world.screen
  expect(options(world).map((option) => option.name)).toEqual(names)
  expect(placeSearch.expanded.value).toBe(true)
  expect(placeSearch.message.value).toBeUndefined()
}

function expectSearches(world: World, texts: readonly string[]): void {
  const searched = world.geonames.requests().map(({ service, text }) => ({ service, text }))
  const expected = texts.flatMap((text) => [
    { service: 'places', text },
    { service: 'address', text },
  ])
  expect(searched).toEqual(expect.arrayContaining(expected))
  expect(searched).toHaveLength(expected.length)
}

export const PLACE_SEARCH_STEPS: readonly StepHandler<World>[] = [
  step(/^the user types (\S+)$/, async (world, [text = '']) => {
    await editTo(world, heldText(world) + text)
  }),

  step(/^the user types (.+) one character every (\S+) milliseconds less one$/, async (world, [text = '', delay = '']) => {
    await editTo(world, heldText(world) + text, parseCount(delay, 'delay') - 1)
  }),

  step(/^the user types the first (\S+) characters of (.+) less one and pauses$/, async (world, [count = '', text = '']) => {
    world.typingGoal = text
    await editAndPause(world, firstCharacters(text, parseCount(count, 'character count') - 1))
  }),

  step(/^the user types the next character and pauses$/, async (world) => {
    if (world.typingGoal === undefined) throw new Error('no text was being typed in an earlier step')
    await editAndPause(world, firstCharacters(world.typingGoal, [...heldText(world)].length + 1))
  }),

  step(/^the user erases the last character and pauses$/, async (world) => {
    await editAndPause(world, [...heldText(world)].slice(0, -1).join(''))
  }),

  step(/^the user (?:has searched|searches) for (?:the first (\S+) characters of )?(.+)$/, async (world, [count, text = '']) => {
    await editAndPause(world, namedText(count, text))
  }),

  step(/^the user pauses$/, async ({ clock }) => {
    await clock.pass(PAUSE_MS)
  }),

  step(/^the user waits (\S+) milliseconds less one$/, async ({ clock }, [delay = '']) => {
    await clock.pass(parseCount(delay, 'delay') - 1)
  }),

  step(/^the user waits one more millisecond$/, async ({ clock }) => {
    await clock.pass(1)
  }),

  step(/^the user presses the (down|up) arrow (?:(\S+) times|once) in the search field$/, ({ screen }, [arrow = '', count]) => {
    const press = arrow === 'down' ? screen.placeSearch.next : screen.placeSearch.previous
    const presses = count === undefined ? 1 : parseCount(count, 'press count')
    for (let pressed = 0; pressed < presses; pressed += 1) press()
  }),

  step(/^the user presses Enter in the search field$/, ({ screen }) => {
    screen.placeSearch.chooseActive()
  }),

  step(/^the user presses Escape in the search field$/, ({ screen }) => {
    screen.placeSearch.close()
  }),

  step(/^the user clicks suggestion (\S+)$/, (world, [position = '']) => {
    const clicked = suggestionPosition(position)
    // Fails here when the list does not show it, rather than choosing nothing.
    optionAt(world, clicked)
    world.screen.placeSearch.choose(clicked - 1)
  }),

  step(/^the user clears the search$/, ({ screen }) => {
    screen.placeSearch.clear()
  }),

  step(/^no search has been made$/, ({ geonames }) => {
    expect(geonames.requests()).toEqual([])
  }),

  step(/^the only search made is for (?:the first (\S+) characters of )?(.+)$/, (world, [count, text = '']) => {
    expectSearches(world, [namedText(count, text)])
  }),

  step(/^every search was made with the GeoNames username (.+)$/, ({ geonames }, [username]) => {
    const usernames = geonames.requests().map((request) => request.username)
    expect(usernames.length).toBeGreaterThan(0)
    expect(usernames).toEqual(usernames.map(() => username))
  }),

  step(/^the suggestion list shows only (.+)$/, (world, [name = '']) => {
    expectSuggestions(world, [name])
  }),

  step(/^the suggestion list shows (\S+) suggestions$/, (world, [count = '']) => {
    expect(options(world)).toHaveLength(parseCount(count, 'suggestion count'))
    expect(world.screen.placeSearch.expanded.value).toBe(true)
  }),

  step(/^the suggestion list shows the address, then the first (\S+) places found less one$/, (world, [count = '']) => {
    const places = world.foundPlaces.slice(0, parseCount(count, 'place count') - 1)
    expectSuggestions(world, [SAINT_ANDRE.shownAs, ...places])
  }),

  step(/^the suggestion list shows the first (\S+) places found$/, (world, [count = '']) => {
    expectSuggestions(world, world.foundPlaces.slice(0, parseCount(count, 'place count')))
  }),

  step(/^the suggestion list is closed$/, ({ screen }) => {
    expect(screen.placeSearch.expanded.value).toBe(false)
    expect(screen.placeSearch.options.value).toEqual([])
    expect(screen.placeSearch.message.value).toBeUndefined()
  }),

  step(/^the search shows the message (.+)$/, ({ screen }, [message]) => {
    expect(screen.placeSearch.message.value).toBe(message)
    expect(screen.placeSearch.options.value).toEqual([])
    expect(screen.placeSearch.expanded.value).toBe(false)
  }),

  step(/^suggestion (\S+) is (?!active$)(.+)$/, (world, [position = '', name]) => {
    const named = suggestionPosition(position)
    expect(optionAt(world, named).name).toBe(name)
    world.notedSuggestion = named
  }),

  step(/^its (type|context) reads (.*)$/, (world, [part = '', text]) => {
    const option = notedOption(world)
    expect(part === 'type' ? option.type : option.context).toBe(text)
  }),

  step(/^suggestion (\S+) is active$/, (world, [position = '']) => {
    const active = optionAt(world, suggestionPosition(position))
    expect(options(world).filter((option) => option.active)).toEqual([active])
    expect(world.screen.placeSearch.activeOptionId.value).toBe(active.id)
  }),

  step(/^the search field reads (.+)$/, (world, [text]) => {
    expect(heldText(world)).toBe(text)
  }),

  step(/^the search field is empty$/, (world) => {
    expect(heldText(world)).toBe('')
  }),

  step(/^the search field is (?!empty$)(.+)$/, ({ screen }, [state = '']) => {
    expect(screen.placeSearch.disabled.value).toBe(parseFlag(state, 'search field state', 'disabled', 'enabled'))
  }),

  step(/^the search field shows the hint (.+)$/, ({ screen }, [hint]) => {
    expect(screen.placeSearch.hint.value).toBe(hint)
  }),

  step(/^clearing the search is (.+)$/, ({ screen }, [offer = '']) => {
    expect(screen.placeSearch.canClear.value).toBe(parseFlag(offer, 'clear offer', 'offered', 'not offered'))
  }),

  step(/^the map is centred on (.+) at zoom (\S+)$/, ({ map }, [centre = '', zoom = '']) => {
    const { lng, lat } = parseLngLat(centre, 'centre')
    expect(map.destinations()).toEqual([
      {
        kind: 'view',
        view: { center: { lng: expect.closeTo(lng, 5), lat: expect.closeTo(lat, 5) }, zoom: parseNumber(zoom, 'zoom') },
      },
    ])
  }),

  step(/^the map shows the extent (.+)$/, ({ map }, [extent = '']) => {
    const expected = parseBbox(extent, 'extent').map((degrees) => expect.closeTo(degrees, 5))
    expect(map.destinations()).toEqual([{ kind: 'extent', extent: expected }])
  }),

  step(/^the map has not moved$/, ({ map }) => {
    expect(map.destinations()).toEqual([])
  }),
]
