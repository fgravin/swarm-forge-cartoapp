import type { Page } from '@playwright/test'

// A 1x1 transparent PNG.
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Answers every request for a map tile locally and records its URL, so a check
 * never depends on a tile server and can assert which tiles were asked for.
 */
export async function serveTilesLocally(page: Page, urlPattern: string | RegExp): Promise<string[]> {
  const requested: string[] = []
  await page.route(urlPattern, async (route) => {
    requested.push(route.request().url())
    await route.fulfill({ contentType: 'image/png', body: BLANK_TILE })
  })
  return requested
}
