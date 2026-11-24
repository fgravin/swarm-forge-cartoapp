import { expect } from 'vitest'

import { OPACITY_SLIDER, type LayerItem } from '../../src/application/useLayers'
import type { WmsTileLayer } from '../../src/domain/wmsTiles'
import { step, type StepHandler } from '../runtime'
import { parseCount, parseFlag, parseNumber, parsePosition } from './values'
import type { World } from './world'

// The parameters of the GetMap request of each tile, with the names in upper case.
const GETMAP_PARAMETERS = {
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  VERSION: '1.3.0',
  STYLES: '',
  CRS: 'EPSG:3857',
  WIDTH: '256',
  HEIGHT: '256',
  FORMAT: 'image/png',
  TRANSPARENT: 'TRUE',
}

function list(text: string): readonly string[] {
  return text.split(', ')
}

/** The position, from 1, of a layer of the panel as a step names it. */
function layerPosition(text: string): number {
  return parsePosition(text, 'layer position')
}

/** The index, from 0, of the layer a step names by its position. */
function indexOf(position: string): number {
  return layerPosition(position) - 1
}

/** The layer at `position`, from 1, which the panel must list. */
function itemAt({ screen }: World, position: number): LayerItem {
  const item = screen.layers.items.value[position - 1]
  if (item === undefined) throw new Error(`the layer panel lists no layer ${position}`)
  return item
}

/** The layer a step names by its position. */
function layerAt(world: World, position: string): LayerItem {
  return itemAt(world, layerPosition(position))
}

function notedLayer(world: World): LayerItem {
  if (world.notedLayer === undefined) throw new Error('no layer was named in an earlier step')
  return itemAt(world, world.notedLayer)
}

function controlsDisabled(item: LayerItem): boolean | 'mixed' {
  if (item.disabled && item.zoomDisabled) return true
  return item.disabled || item.zoomDisabled ? 'mixed' : false
}

function drawnLayer({ map }: World, name: string): WmsTileLayer {
  const layer = map.drawnLayers().find((each) => each.id === name)
  if (layer === undefined) throw new Error(`the map does not draw the layer ${name}`)
  return layer
}

function drawnNames({ map }: World): readonly string[] {
  return map.drawnLayers().map((layer) => layer.id)
}

function pressEye(world: World, position: string): void {
  world.screen.layers.toggleShown(indexOf(position))
}

function showLayer(world: World, position: string): void {
  pressEye(world, position)
  expect(layerAt(world, position).shown).toBe(true)
}

function moveOpacity(world: World, position: string, steps: number): void {
  const index = indexOf(position)
  const direction = Math.sign(steps)
  for (let moved = 0; moved < Math.abs(steps); moved += 1) {
    world.screen.layers.setOpacity(index, layerAt(world, position).opacity + direction * OPACITY_SLIDER.step)
  }
}

/** Parameters, by their names in upper case. */
function parametersOf(url: URL): Readonly<Record<string, string>> {
  return Object.fromEntries([...url.searchParams].map(([name, value]) => [name.toUpperCase(), value]))
}

export const LAYER_STEPS: readonly StepHandler<World>[] = [
  step(/^the layer panel lists (\S+) layers$/, ({ screen }, [count = '']) => {
    expect(screen.layers.items.value).toHaveLength(parseCount(count, 'layer count'))
  }),

  step(/^layer (\S+) of the layer panel is (.+)$/, (world, [position = '', name]) => {
    expect(layerAt(world, position).title).toBe(name)
    world.notedLayer = layerPosition(position)
  }),

  step(/^its status reads (.+)$/, (world, [status]) => {
    expect(notedLayer(world).status).toBe(status)
  }),

  step(/^its controls are (.+)$/, (world, [state = '']) => {
    expect(controlsDisabled(notedLayer(world))).toBe(parseFlag(state, 'controls state', 'disabled', 'enabled'))
  }),

  step(/^the controls of the other layers are (.+)$/, (world, [state = '']) => {
    const disabled = parseFlag(state, 'controls state', 'disabled', 'enabled')
    const others = world.screen.layers.items.value.filter((_, index) => index + 1 !== world.notedLayer)
    expect(others.length).toBeGreaterThan(0)
    expect(others.map(controlsDisabled)).toEqual(others.map(() => disabled))
  }),

  step(/^the application has asked for the capabilities of (.+)$/, ({ wms }, [servers = '']) => {
    const asked = wms.requests().map((request) => request.serverUrl)
    expect([...asked].sort()).toEqual([...list(servers)].sort())
  }),

  step(/^the user presses the eye button of layer (\S+)$/, (world, [position = '']) => {
    pressEye(world, position)
  }),

  step(/^the user has shown layer (\S+)$/, (world, [position = '']) => {
    showLayer(world, position)
  }),

  step(/^the user has shown the layers (.+)$/, (world, [positions = '']) => {
    list(positions).forEach((position) => showLayer(world, position))
  }),

  step(/^the user hides layer (\S+) and shows it again$/, (world, [position = '']) => {
    pressEye(world, position)
    expect(layerAt(world, position).shown).toBe(false)
    pressEye(world, position)
  }),

  step(/^the eye button of layer (\S+) is named (.+)$/, (world, [position = '', name]) => {
    expect(layerAt(world, position).eyeLabel).toBe(name)
    world.notedLayer = layerPosition(position)
  }),

  step(/^it is (.+)$/, (world, [state = '']) => {
    expect(notedLayer(world).shown).toBe(parseFlag(state, 'eye button state', 'pressed', 'not pressed'))
  }),

  step(/^the map draws no layer$/, ({ map }) => {
    expect(map.drawnLayers()).toEqual([])
  }),

  step(/^the map draws only the layer (\S+)$/, (world, [name]) => {
    expect(drawnNames(world)).toEqual([name])
  }),

  step(/^the map draws the layers (.+), from top to bottom$/, (world, [names = '']) => {
    expect(drawnNames(world)).toEqual(list(names))
  }),

  step(/^the map draws the layer (\S+) at an opacity of (\S+)$/, (world, [name = '', opacity = '']) => {
    expect(drawnLayer(world, name).opacity).toBeCloseTo(parseNumber(opacity, 'opacity'), 10)
  }),

  step(/^the map draws the layer (\S+) from the GetMap tiles of (\S+)$/, (world, [name = '', service = '']) => {
    const layer = drawnLayer(world, name)
    const tiles = new URL(layer.tileUrl)
    const announced = new URL(service)
    expect(tiles.protocol).toBe('https:')
    expect(tiles.origin + tiles.pathname).toBe(announced.origin + announced.pathname)
    expect(parametersOf(tiles)).toEqual({ ...parametersOf(announced), ...GETMAP_PARAMETERS, LAYERS: name, BBOX: '{bbox-epsg-3857}' })
    expect(layer.tileUrl).toContain('BBOX={bbox-epsg-3857}')
    expect(layer.tileSize).toBe(256)
  }),

  step(/^the opacity of layer (\S+) reads (.+)$/, (world, [position = '', text]) => {
    expect(layerAt(world, position).opacityText).toBe(text)
  }),

  step(
    /^the user lowers the opacity of layer (\S+) by (\S+) steps, then raises it by (\S+) steps$/,
    (world, [position = '', lower = '', raise = '']) => {
      moveOpacity(world, position, -parseCount(lower, 'steps down'))
      moveOpacity(world, position, parseCount(raise, 'steps up'))
    },
  ),

  step(/^the user has lowered the opacity of layer (\S+) by (\S+) steps$/, (world, [position = '', steps = '']) => {
    moveOpacity(world, position, -parseCount(steps, 'steps down'))
  }),

  step(/^the user presses the zoom button of layer (\S+)$/, ({ screen }, [position = '']) => {
    screen.layers.zoomTo(indexOf(position))
  }),

  step(/^the zoom button of layer (\S+) is (.+)$/, (world, [position = '', state = '']) => {
    expect(layerAt(world, position).zoomDisabled).toBe(parseFlag(state, 'zoom button state', 'disabled', 'enabled'))
  }),

  step(/^the user presses the legend button of layer (\S+)$/, ({ screen }, [position = '']) => {
    screen.layers.toggleLegend(indexOf(position))
  }),

  step(/^the user has unfolded the legend of layer (\S+)$/, (world, [position = '']) => {
    world.screen.layers.toggleLegend(indexOf(position))
    expect(layerAt(world, position).legendUnfolded).toBe(true)
  }),

  step(/^the legend image of layer (\S+) fails to load$/, ({ screen }, [position = '']) => {
    screen.layers.legendFailed(indexOf(position))
  }),

  step(/^the legend of layer (\S+) is (.+)$/, (world, [position = '', state = '']) => {
    const item = layerAt(world, position)
    const unfolded = parseFlag(state, 'legend state', 'unfolded', 'folded')
    expect(item.legendUnfolded).toBe(unfolded)
    if (!unfolded) expect([item.legendImage, item.legendMessage]).toEqual([undefined, undefined])
  }),

  step(/^the legend of layer (\S+) shows the image (\S+), described as (.+)$/, (world, [position = '', url, description]) => {
    const item = layerAt(world, position)
    expect(item.legendUnfolded).toBe(true)
    expect(item.legendImage).toEqual({ url, description })
    expect(item.legendMessage).toBeUndefined()
  }),

  step(/^the legend of layer (\S+) reads (.+)$/, (world, [position = '', message]) => {
    const item = layerAt(world, position)
    expect(item.legendUnfolded).toBe(true)
    expect(item.legendMessage).toBe(message)
    expect(item.legendImage).toBeUndefined()
  }),
]
