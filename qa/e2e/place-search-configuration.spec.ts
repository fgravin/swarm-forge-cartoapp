import { spawnSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

import { expectOnlySelected, steadyText } from './mapScreen'
import { dragOnMap, mapCentre, offset } from './pointer'
import { openSearch, pause, searchFor, typeSlowly } from './searchBox'
import { CONFIGURED, USERNAME_EMPTY, USERNAME_UNSET } from './servers'

// Executable form of qa/procedures/place-search-configuration.md. The builds
// it opens are made and served by `playwright.config.ts` (see `servers.ts`).

const UNCONFIGURED_HINT = 'Recherche non configurée'

const UNCONFIGURED_RUNS = [
  { name: 'VITE_GEONAMES_USERNAME unset', served: USERNAME_UNSET },
  { name: 'VITE_GEONAMES_USERNAME empty', served: USERNAME_EMPTY },
] as const

test.describe('place-search-configuration 1: without a GeoNames username, the search is disabled', () => {
  for (const { name, served } of UNCONFIGURED_RUNS) {
    test(name, async ({ page }) => {
      const { screen, search, geonames } = await openSearch(page, undefined, served.url)

      await expect(search.field).toBeDisabled()
      await expect(search.field).toHaveAttribute('placeholder', UNCONFIGURED_HINT)

      // A user's click on a disabled field: the field takes no focus, and the keys go nowhere.
      const field = await search.field.boundingBox()
      if (field === null) throw new Error('The search field is not on screen.')
      await page.mouse.click(field.x + field.width / 2, field.y + field.height / 2)
      await typeSlowly(page, 'Gre')
      await pause(page)

      await expect(search.field).toHaveValue('')
      expect(geonames.requests).toHaveLength(0)

      const view = await steadyText(screen.viewIndicator)
      const c = await mapCentre(screen)
      await dragOnMap(page, c, offset(c, 100, 0))
      await expect(screen.viewIndicator).not.toHaveText(view)
      await screen.basemap('World Imagery').click()
      await expectOnlySelected(screen, 'World Imagery')
    })
  }
})

test('place-search-configuration 2: GeoNames is searched with the configured username', async ({ page }) => {
  const { search, geonames } = await openSearch(page, undefined, CONFIGURED.url)

  await searchFor(page, search, 'Gre')

  expect(geonames.requests.length).toBeGreaterThan(0)
  for (const { url } of geonames.requests) {
    expect(url.searchParams.getAll('username'), url.toString()).toEqual(['carto-qa'])
  }
})

/** Runs git in the project directory. */
function git(...args: readonly string[]): { readonly status: number | null; readonly output: string } {
  const run = spawnSync('git', args, { encoding: 'utf8' })
  return { status: run.status, output: run.stdout }
}

test('place-search-configuration 3: the username is kept out of the repository', () => {
  expect(git('check-ignore', '-q', '.env.local').status, '.env.local is ignored').toBe(0)
  expect(git('ls-files', '.env', '.env.local').output).toBe('')
  // The QA procedures name the made-up QA username, `carto-qa`, and this check's own command.
  expect(git('grep', '-n', 'VITE_GEONAMES_USERNAME=', '--', ':!qa/procedures/').output).toBe('')
})
