import { expect } from 'vitest'

import type { BasemapOption } from '../../src/application/useBasemaps'
import { tileServerUrls } from '../../src/domain/rasterTiles'
import { step, type StepHandler } from '../runtime'
import { parseCount, parseNumber, parsePosition } from './values'
import type { World } from './world'

function offeredBasemaps({ screen }: World): readonly BasemapOption[] {
  return screen.groups.value.flatMap((group) => group.options)
}

/** How many different basemaps the map has drawn, told apart by their tile URLs. */
function distinctBasemapsDrawn({ map }: World): number {
  return new Set(map.drawnBasemaps().map((basemap) => basemap.tileUrls.join(' '))).size
}

function chooseBasemap(world: World, name: string): void {
  const option = offeredBasemaps(world).find((each) => each.name === name)
  if (!option) throw new Error(`the basemap panel offers no basemap named "${name}"`)
  world.screen.select(option.id)
}

export const BASEMAP_STEPS: readonly StepHandler<World>[] = [
  step(/^group (\S+) of the basemap panel is (.+)$/, ({ screen }, [position = '', provider]) => {
    const group = screen.groups.value[parsePosition(position, 'group position') - 1]
    expect(group?.provider).toBe(provider)
  }),

  step(/^basemap (\S+) of the (.+) group is (.+)$/, ({ screen }, [position = '', provider, name]) => {
    const group = screen.groups.value.find((each) => each.provider === provider)
    const option = group?.options[parsePosition(position, 'basemap position') - 1]
    expect(option?.name).toBe(name)
  }),

  step(/^the basemap panel offers (\S+) basemaps in (\S+) groups$/, (world, [basemapCount = '', groupCount = '']) => {
    expect(offeredBasemaps(world)).toHaveLength(parseCount(basemapCount, 'basemap count'))
    expect(world.screen.groups.value).toHaveLength(parseCount(groupCount, 'group count'))
  }),

  step(/^the user chooses the basemap (.+)$/, (world, [name = '']) => {
    chooseBasemap(world, name)
  }),

  step(/^the user chooses each basemap in turn$/, (world) => {
    for (const option of offeredBasemaps(world)) chooseBasemap(world, option.name)
  }),

  step(/^the basemap (.+) is the only one selected$/, (world, [name]) => {
    const selected = offeredBasemaps(world).filter((option) => option.selected)
    expect(selected.map((option) => option.name)).toEqual([name])
  }),

  step(/^the map draws raster tiles only from (.+)$/, ({ map }, [tileUrl = '']) => {
    expect(map.drawnBasemaps().at(-1)?.tileUrls).toEqual(tileServerUrls(tileUrl))
  }),

  step(/^the map credits only (.+)$/, ({ map }, [attribution]) => {
    expect(map.credits()).toEqual([attribution])
  }),

  step(/^every basemap was drawn from tiles of (\S+) pixels up to zoom level (\S+)$/, (world, [size = '', zoom = '']) => {
    const drawn = world.map.drawnBasemaps()
    const expected = { tileSize: parseNumber(size, 'tile size'), maxZoom: parseNumber(zoom, 'maximum zoom') }
    expect(distinctBasemapsDrawn(world)).toBe(offeredBasemaps(world).length)
    expect(drawn.map(({ tileSize, maxZoom }) => ({ tileSize, maxZoom }))).toEqual(drawn.map(() => expected))
  }),
]
