import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import type { Bbox } from './bbox'
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

/** What the user does: press the drawing button, clear the bbox, or act on the map. */
type Step = { readonly kind: 'toggle' } | { readonly kind: 'clear' } | { readonly kind: 'draw'; readonly event: DrawEvent }

// Pixels close together, so that drags both under and over 3 pixels are common.
const pointers: fc.Arbitrary<MapPointer> = fc.record({
  point: fc.record({ x: fc.integer({ min: 0, max: 6 }), y: fc.integer({ min: 0, max: 6 }) }),
  position: fc.record({
    lng: fc.double({ min: -180, max: 180, noNaN: true }),
    lat: fc.double({ min: -85, max: 85, noNaN: true }),
  }),
})

const drawEvents: fc.Arbitrary<DrawEvent> = fc.oneof(
  fc.record({ type: fc.constant('press' as const), pointer: pointers }),
  fc.record({ type: fc.constant('move' as const), pointer: pointers }),
  fc.record({ type: fc.constant('release' as const), pointer: pointers }),
  fc.constant({ type: 'cancel' } as const),
)

// Mostly draw events, so that drags often run to their release.
const steps: fc.Arbitrary<Step> = fc.oneof(
  { arbitrary: fc.constant({ kind: 'toggle' } as const), weight: 1 },
  { arbitrary: fc.constant({ kind: 'clear' } as const), weight: 1 },
  { arbitrary: fc.record({ kind: fc.constant('draw' as const), event: drawEvents }), weight: 4 },
)

function take(capture: BboxCapture, step: Step): BboxCapture {
  switch (step.kind) {
    case 'toggle':
      return toggleDrawing(capture)
    case 'clear':
      return clearBbox(capture)
    case 'draw':
      return applyDrawEvent(capture, step.event)
    default: {
      const unknown: never = step
      throw new Error(`unknown step ${JSON.stringify(unknown)}`)
    }
  }
}

/** The bbox a drag captures, if it is at least 3 pixels wide and high. */
function capturedBy(start: MapPointer, end: MapPointer): Bbox | undefined {
  const wide = Math.abs(end.point.x - start.point.x) >= 3
  const high = Math.abs(end.point.y - start.point.y) >= 3
  if (!wide || !high) return undefined
  const { lng: lng1, lat: lat1 } = start.position
  const { lng: lng2, lat: lat2 } = end.position
  return [Math.min(lng1, lng2), Math.min(lat1, lat2), Math.max(lng1, lng2), Math.max(lat1, lat2)]
}

function expectStepFollowsTheRules(before: BboxCapture, step: Step, after: BboxCapture): void {
  if (step.kind === 'toggle') {
    expect(isDrawingModeOn(after)).toBe(!isDrawingModeOn(before))
    expect(after.bbox).toBe(before.bbox)
    return
  }
  if (step.kind === 'clear') {
    expect(after.bbox).toBeUndefined()
    expect(after.drawing).toBe(before.drawing)
    return
  }
  const { event } = step
  const { drawing } = before
  if (drawing.kind === 'off') {
    expect(after).toBe(before)
    return
  }
  if (event.type === 'cancel') {
    expect(isDrawingModeOn(after)).toBe(false)
    expect(after.bbox).toBe(before.bbox)
    return
  }
  const captured = event.type === 'release' && drawing.kind === 'dragging' ? capturedBy(drawing.start, event.pointer) : undefined
  if (captured === undefined) {
    expect(after.bbox).toBe(before.bbox)
    expect(isDrawingModeOn(after)).toBe(true)
  } else {
    expect(after.bbox).toEqual(captured)
    expect(isDrawingModeOn(after)).toBe(false)
  }
}

function expectRectanglesMatch(capture: BboxCapture): void {
  const rectangles = shownRectangles(capture)
  const captured = capture.bbox === undefined ? [] : [capture.bbox]
  expect(rectangles.slice(0, captured.length)).toEqual(captured)
  expect(rectangles).toHaveLength(captured.length + (capture.drawing.kind === 'dragging' ? 1 : 0))
  for (const [west, south, east, north] of rectangles) {
    expect(west).toBeLessThanOrEqual(east)
    expect(south).toBeLessThanOrEqual(north)
  }
}

describe('bbox capture', () => {
  it('changes the bbox only by a drag of at least 3 by 3 pixels, or by clearing it, and keeps one bbox at most', () => {
    fc.assert(
      fc.property(fc.array(steps, { maxLength: 60, size: 'max' }), (sequence) => {
        sequence.reduce((before, step) => {
          const after = take(before, step)
          expectStepFollowsTheRules(before, step, after)
          expectRectanglesMatch(after)
          return after
        }, INITIAL_BBOX_CAPTURE)
      }),
    )
  })
})
