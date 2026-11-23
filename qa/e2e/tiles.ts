import type { Page } from '@playwright/test'

// A 1x1 PNG of one colour: every tile is featureless, so the map shows only
// what the application draws over its basemap.
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

// The application is served over plain HTTP from the test machine. Every HTTPS
// request leaves it for an outside service: the tile servers.
const leavesTheApplication = (url: URL): boolean => url.protocol === 'https:'

/**
 * Answers every request to an outside server locally and records its URL, in
 * order, so a check never depends on a tile server and can assert which tiles
 * were asked for.
 */
export async function serveTilesLocally(page: Page): Promise<string[]> {
  const requested: string[] = []
  await page.route(leavesTheApplication, async (route) => {
    requested.push(route.request().url())
    await route.fulfill({ contentType: 'image/png', body: BLANK_TILE })
  })
  return requested
}

/** A tile request read against a tile URL template. */
export interface Tile {
  readonly url: string
  readonly server: string
  readonly z: number
  readonly x: number
  readonly y: number
}

const PLACEHOLDER = /(\{[^{}]+\})/
const SERVER_LIST = /\{([^{}]*,[^{}]*)\}/

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function placeholderPattern(name: string): string {
  if (name.includes(',')) return `(?<server>${name.split(',').map(escapeRegExp).join('|')})`
  return `(?<${name}>\\d+)`
}

function templatePattern(template: string): RegExp {
  const parts = template
    .split(PLACEHOLDER)
    .map((part) => (PLACEHOLDER.test(part) ? placeholderPattern(part.slice(1, -1)) : escapeRegExp(part)))
  return new RegExp(`^${parts.join('')}$`)
}

/**
 * The servers a tile URL template names: `{a,b,c,d}` stands for four servers,
 * one per letter. A template without such a list names one server, its own.
 */
export function serversOf(template: string): readonly string[] {
  return SERVER_LIST.exec(template)?.[1]?.split(',') ?? ['']
}

/**
 * The requests in `urls` that are tiles of `template`, a tile URL written as in
 * the procedures, for example `https://{a,b,c,d}.example.com/{z}/{x}/{y}.png`.
 */
export function tilesOf(template: string, urls: readonly string[]): readonly Tile[] {
  const pattern = templatePattern(template)
  return urls.flatMap((url) => {
    const groups = pattern.exec(url)?.groups
    if (groups === undefined) return []
    return [{ url, server: groups.server ?? '', z: Number(groups.z), x: Number(groups.x), y: Number(groups.y) }]
  })
}
