import { describe, expect, it } from 'vitest'

import { bboxBetween, type Bbox } from './bbox'
import {
  applyDrawEvent,
  clearBbox,
  INITIAL_BBOX_CAPTURE,
  isDrawingModeOn,
  shownRectangles,
  toggleDrawing,
  type BboxCapture,
  type DrawEvent,
  type MapPointer,
} from './bboxCapture'

/** A pointer at `x`, `y` pixels on a map that shows 100 pixels per degree, from 0° E, 0° N at its top left corner. */
function at(x: number, y: number): MapPointer {
  return { point: { x, y }, position: { lng: x / 100, lat: -y / 100 } }
}

function drag(capture: BboxCapture, from: MapPointer, to: MapPointer): BboxCapture {
  const events: readonly DrawEvent[] = [
    { type: 'press', pointer: from },
    { type: 'move', pointer: to },
    { type: 'release', pointer: to },
  ]
  return events.reduce(applyDrawEvent, capture)
}

const ready = toggleDrawing(INITIAL_BBOX_CAPTURE)
const PREVIOUS: Bbox = bboxBetween(at(500, 500).position, at(600, 600).position)
const captured = drag(ready, at(500, 500), at(600, 600))
const readyWithPrevious = toggleDrawing(captured)

describe('the drawing mode', () => {
  it('is off at first, without a bbox or a rectangle', () => {
    expect(isDrawingModeOn(INITIAL_BBOX_CAPTURE)).toBe(false)
    expect(INITIAL_BBOX_CAPTURE.bbox).toBeUndefined()
    expect(shownRectangles(INITIAL_BBOX_CAPTURE)).toEqual([])
  })

  it('is turned on, then off again, by the drawing button', () => {
    expect(isDrawingModeOn(ready)).toBe(true)
    expect(isDrawingModeOn(toggleDrawing(ready))).toBe(false)
  })

  it('stays on while a rectangle is being drawn', () => {
    expect(isDrawingModeOn(applyDrawEvent(ready, { type: 'press', pointer: at(10, 10) }))).toBe(true)
  })

  it('is turned off by the drawing button while a rectangle is being drawn, dropping that rectangle', () => {
    const dragging = applyDrawEvent(readyWithPrevious, { type: 'press', pointer: at(10, 10) })

    const off = toggleDrawing(dragging)

    expect(isDrawingModeOn(off)).toBe(false)
    expect(shownRectangles(off)).toEqual([PREVIOUS])
  })

  it('ignores the pointer while it is off', () => {
    const events: readonly DrawEvent[] = [
      { type: 'press', pointer: at(10, 10) },
      { type: 'move', pointer: at(50, 50) },
      { type: 'release', pointer: at(50, 50) },
      { type: 'cancel' },
    ]
    for (const event of events) expect(applyDrawEvent(captured, event)).toBe(captured)
  })
})

describe('drawing a rectangle', () => {
  it('shows a rectangle from where the pointer was pressed to where it is', () => {
    const pressed = applyDrawEvent(ready, { type: 'press', pointer: at(10, 20) })
    const moved = applyDrawEvent(pressed, { type: 'move', pointer: at(110, 220) })

    expect(shownRectangles(moved)).toEqual([bboxBetween(at(10, 20).position, at(110, 220).position)])
  })

  it('follows the pointer, whichever way it goes from where it was pressed', () => {
    const pressed = applyDrawEvent(ready, { type: 'press', pointer: at(100, 100) })
    const first = applyDrawEvent(pressed, { type: 'move', pointer: at(200, 200) })
    const second = applyDrawEvent(first, { type: 'move', pointer: at(50, 40) })

    expect(shownRectangles(second)).toEqual([bboxBetween(at(100, 100).position, at(50, 40).position)])
    expect(second.bbox).toBeUndefined()
  })

  it('shows the rectangle being drawn beside the bbox captured before', () => {
    const pressed = applyDrawEvent(readyWithPrevious, { type: 'press', pointer: at(10, 10) })
    const moved = applyDrawEvent(pressed, { type: 'move', pointer: at(90, 90) })

    expect(shownRectangles(moved)).toEqual([PREVIOUS, bboxBetween(at(10, 10).position, at(90, 90).position)])
  })

  it('ignores a pointer that moves or is released without having been pressed', () => {
    expect(applyDrawEvent(ready, { type: 'move', pointer: at(10, 10) })).toBe(ready)
    expect(applyDrawEvent(ready, { type: 'release', pointer: at(10, 10) })).toBe(ready)
  })

  it('starts again from a new press', () => {
    const pressed = applyDrawEvent(ready, { type: 'press', pointer: at(10, 10) })
    const pressedAgain = applyDrawEvent(pressed, { type: 'press', pointer: at(300, 300) })
    const moved = applyDrawEvent(pressedAgain, { type: 'move', pointer: at(400, 400) })

    expect(shownRectangles(moved)).toEqual([bboxBetween(at(300, 300).position, at(400, 400).position)])
  })
})

describe('releasing the pointer', () => {
  it('captures the rectangle from the press to the release as the bbox, and ends the drawing mode', () => {
    const pressed = applyDrawEvent(ready, { type: 'press', pointer: at(10, 20) })
    const moved = applyDrawEvent(pressed, { type: 'move', pointer: at(90, 90) })
    const released = applyDrawEvent(moved, { type: 'release', pointer: at(110, 220) })

    const bbox = bboxBetween(at(10, 20).position, at(110, 220).position)
    expect(released.bbox).toEqual(bbox)
    expect(isDrawingModeOn(released)).toBe(false)
    expect(shownRectangles(released)).toEqual([bbox])
  })

  it('replaces the bbox captured before', () => {
    const replaced = drag(readyWithPrevious, at(10, 10), at(90, 90))

    expect(replaced.bbox).toEqual(bboxBetween(at(10, 10).position, at(90, 90).position))
    expect(shownRectangles(replaced)).toEqual([replaced.bbox])
  })

  it.each([
    ['3 by 3 pixels', at(13, 13)],
    ['3 by 3 pixels, up and to the left', at(7, 7)],
  ])('captures a drag of %s', (_size, to) => {
    const released = drag(readyWithPrevious, at(10, 10), to)

    expect(released.bbox).toEqual(bboxBetween(at(10, 10).position, to.position))
    expect(isDrawingModeOn(released)).toBe(false)
  })

  it.each([
    ['2 by 3 pixels', at(12, 13)],
    ['3 by 2 pixels', at(13, 12)],
    ['2 by 3 pixels, up and to the left', at(8, 7)],
    ['3 by 2 pixels, up and to the left', at(7, 8)],
    ['a click', at(10, 10)],
  ])('captures nothing from a drag of %s, keeps the bbox, and stays in the drawing mode', (_size, to) => {
    const released = drag(readyWithPrevious, at(10, 10), to)

    expect(released.bbox).toEqual(PREVIOUS)
    expect(isDrawingModeOn(released)).toBe(true)
    expect(shownRectangles(released)).toEqual([PREVIOUS])
  })
})

describe('cancelling', () => {
  it('drops the rectangle being drawn, keeps the bbox, and ends the drawing mode', () => {
    const pressed = applyDrawEvent(readyWithPrevious, { type: 'press', pointer: at(10, 10) })
    const moved = applyDrawEvent(pressed, { type: 'move', pointer: at(90, 90) })

    const cancelled = applyDrawEvent(moved, { type: 'cancel' })

    expect(isDrawingModeOn(cancelled)).toBe(false)
    expect(cancelled.bbox).toEqual(PREVIOUS)
    expect(shownRectangles(cancelled)).toEqual([PREVIOUS])
  })

  it('ends the drawing mode before anything is drawn', () => {
    expect(isDrawingModeOn(applyDrawEvent(ready, { type: 'cancel' }))).toBe(false)
  })
})

describe('clearing the bbox', () => {
  it('removes the bbox and its rectangle', () => {
    const cleared = clearBbox(captured)

    expect(cleared.bbox).toBeUndefined()
    expect(shownRectangles(cleared)).toEqual([])
  })

  it('changes nothing without a bbox', () => {
    expect(clearBbox(ready)).toBe(ready)
  })

  it('leaves the drawing mode as it was', () => {
    expect(isDrawingModeOn(clearBbox(readyWithPrevious))).toBe(true)
    expect(isDrawingModeOn(clearBbox(captured))).toBe(false)
  })
})
