import { expect } from 'vitest'

import type { MapPointer } from '../../src/domain/bboxCapture'
import type { LngLat } from '../../src/domain/mapView'
import { step, type StepHandler } from '../runtime'
import { parseBbox, parseCount, parseFlag, parseLngLat } from './values'
import type { World } from './world'

// Corners away from every bbox of the examples, for the steps that do not give theirs.
const SYDNEY = { from: { lng: 151.2, lat: -33.9 }, to: { lng: 151.3, lat: -33.8 } }
const TOKYO = { from: { lng: 139.6, lat: 35.6 }, to: { lng: 139.8, lat: 35.7 } }
// Where a drag given only by its size in pixels starts.
const PIXEL_DRAG_START: LngLat = { lng: 10, lat: 50 }
// Where the user moves and zooms the map to, away from the view it starts at.
const BUENOS_AIRES = { center: { lng: -58.3816, lat: -34.6037 }, zoom: 11 }

function drag({ map }: World, from: MapPointer, to: MapPointer): void {
  map.draw({ type: 'press', pointer: from })
  map.draw({ type: 'move', pointer: to })
  map.draw({ type: 'release', pointer: to })
}

function dragBetween(world: World, from: LngLat, to: LngLat): void {
  drag(world, world.map.pointerAt(from), world.map.pointerAt(to))
}

function turnDrawingModeOn({ screen }: World): void {
  screen.bboxCapture.toggleDrawing()
  expect(screen.bboxCapture.drawingMode.value).toBe(true)
}

/** The map shows `expected`, to 5 decimals, and no other rectangle. */
function expectOnlyRectangle({ map }: World, expected: string): void {
  const corners = parseBbox(expected, 'rectangle')
  expect(map.rectangles()).toEqual([corners.map((degrees) => expect.closeTo(degrees, 5))])
}

function notedBbox(world: World): string {
  if (world.notedBbox === undefined) throw new Error('no bbox was captured in an earlier step')
  return world.notedBbox
}

export const BBOX_STEPS: readonly StepHandler<World>[] = [
  step(/^the user presses the drawing button$/, ({ screen }) => {
    screen.bboxCapture.toggleDrawing()
  }),

  step(/^the user has turned the drawing mode on$/, (world) => {
    turnDrawingModeOn(world)
  }),

  step(/^the drawing mode is (.+)$/, ({ screen, map }, [text = '']) => {
    const on = parseFlag(text, 'drawing mode', 'on', 'off')
    expect(screen.bboxCapture.drawingMode.value).toBe(on)
    expect(map.drawingMode()).toBe(on)
  }),

  step(/^the user presses Escape$/, ({ map }) => {
    map.draw({ type: 'cancel' })
  }),

  step(/^the user drags on the map from (.+) to (.+)$/, (world, [from = '', to = '']) => {
    dragBetween(world, parseLngLat(from, 'start corner'), parseLngLat(to, 'end corner'))
  }),

  step(/^the user drags on the map across (\S+) by (\S+) pixels$/, (world, [width = '', height = '']) => {
    const from = world.map.pointerAt(PIXEL_DRAG_START)
    const { x, y } = from.point
    const to = world.map.pointerAtPoint({
      x: x + parseCount(width, 'width'),
      y: y + parseCount(height, 'height'),
    })
    drag(world, from, to)
  }),

  step(/^the user starts dragging on the map at (.+)$/, ({ map }, [corner = '']) => {
    map.draw({ type: 'press', pointer: map.pointerAt(parseLngLat(corner, 'start corner')) })
  }),

  step(/^the user moves the pointer to (.+)$/, ({ map }, [corner = '']) => {
    map.draw({ type: 'move', pointer: map.pointerAt(parseLngLat(corner, 'pointer corner')) })
  }),

  step(/^the user has started dragging a rectangle on the map$/, ({ map }) => {
    map.draw({ type: 'press', pointer: map.pointerAt(TOKYO.from) })
    map.draw({ type: 'move', pointer: map.pointerAt(TOKYO.to) })
  }),

  step(/^the user has captured a bbox$/, (world) => {
    turnDrawingModeOn(world)
    dragBetween(world, SYDNEY.from, SYDNEY.to)
    world.notedBbox = world.screen.bboxCapture.bboxText.value
    expectOnlyRectangle(world, world.notedBbox)
  }),

  step(/^the user clears the bbox$/, ({ screen }) => {
    screen.bboxCapture.clearBbox()
  }),

  step(/^the user moves and zooms the map$/, ({ map }) => {
    map.moveTo(BUENOS_AIRES)
  }),

  step(/^the bbox panel reads (.+)$/, ({ screen }, [text]) => {
    expect(screen.bboxCapture.bboxText.value).toBe(text)
  }),

  step(/^the map shows the rectangle (.+)$/, (world, [rectangle = '']) => {
    expectOnlyRectangle(world, rectangle)
  }),

  step(/^the map shows no rectangle$/, ({ map }) => {
    expect(map.rectangles()).toEqual([])
  }),

  step(/^the previous bbox is (.+)$/, (world, [outcome = '']) => {
    const kept = parseFlag(outcome, 'previous bbox outcome', 'kept', 'replaced')
    const previous = notedBbox(world)
    const panel = world.screen.bboxCapture.bboxText.value
    if (kept) expect(panel).toBe(previous)
    else expect(panel).not.toBe(previous)
    expectOnlyRectangle(world, panel)
  }),

  step(/^clearing the bbox is (.+)$/, ({ screen }, [offer = '']) => {
    expect(screen.bboxCapture.canClear.value).toBe(parseFlag(offer, 'clear offer', 'offered', 'not offered'))
  }),
]
