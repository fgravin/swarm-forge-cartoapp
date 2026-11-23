import { bboxBetween, type Bbox } from './bbox'
import type { LngLat } from './mapView'

/** A position on the screen, in pixels from the top left corner of the map. */
export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

/** Where the pointer is, on the screen and on the Earth. */
export interface MapPointer {
  readonly point: ScreenPoint
  readonly position: LngLat
}

/** What the user does on the map in the drawing mode: press, move, and release the pointer, or cancel (Escape). */
export type DrawEvent =
  | { readonly type: 'press'; readonly pointer: MapPointer }
  | { readonly type: 'move'; readonly pointer: MapPointer }
  | { readonly type: 'release'; readonly pointer: MapPointer }
  | { readonly type: 'cancel' }

/** The drawing mode: off, on and waiting for a drag, or on with a rectangle being drawn. */
export type Drawing =
  | { readonly kind: 'off' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'dragging'; readonly start: MapPointer; readonly current: MapPointer }

/** The bbox the user captured, if any, and the drawing mode. */
export interface BboxCapture {
  readonly drawing: Drawing
  readonly bbox: Bbox | undefined
}

const OFF: Drawing = { kind: 'off' }
const READY: Drawing = { kind: 'ready' }

/** A drag narrower or lower than this, in pixels, captures nothing. */
const MIN_DRAG_PIXELS = 3

export const INITIAL_BBOX_CAPTURE: BboxCapture = { drawing: OFF, bbox: undefined }

export function isDrawingModeOn(capture: BboxCapture): boolean {
  return capture.drawing.kind !== 'off'
}

/** What the drawing button does. */
export function toggleDrawing(capture: BboxCapture): BboxCapture {
  return { ...capture, drawing: isDrawingModeOn(capture) ? OFF : READY }
}

export function clearBbox(capture: BboxCapture): BboxCapture {
  return capture.bbox === undefined ? capture : { ...capture, bbox: undefined }
}

function largeEnough(from: ScreenPoint, to: ScreenPoint): boolean {
  return Math.abs(to.x - from.x) >= MIN_DRAG_PIXELS && Math.abs(to.y - from.y) >= MIN_DRAG_PIXELS
}

function release(capture: BboxCapture, start: MapPointer, end: MapPointer): BboxCapture {
  if (!largeEnough(start.point, end.point)) return { ...capture, drawing: READY }
  return { drawing: OFF, bbox: bboxBetween(start.position, end.position) }
}

function applyWhileOn(capture: BboxCapture, drawing: Exclude<Drawing, { kind: 'off' }>, event: DrawEvent): BboxCapture {
  switch (event.type) {
    case 'press':
      return { ...capture, drawing: { kind: 'dragging', start: event.pointer, current: event.pointer } }
    case 'move':
      return drawing.kind === 'dragging' ? { ...capture, drawing: { ...drawing, current: event.pointer } } : capture
    case 'release':
      return drawing.kind === 'dragging' ? release(capture, drawing.start, event.pointer) : capture
    case 'cancel':
      return { ...capture, drawing: OFF }
    default: {
      const unexpected: never = event
      throw new Error(`Unexpected draw event: ${JSON.stringify(unexpected)}`)
    }
  }
}

/** What a press, move, or release of the pointer, or Escape, does. Nothing while the drawing mode is off. */
export function applyDrawEvent(capture: BboxCapture, event: DrawEvent): BboxCapture {
  const { drawing } = capture
  return drawing.kind === 'off' ? capture : applyWhileOn(capture, drawing, event)
}

/** The rectangles on the map: the captured bbox, then the rectangle being drawn. */
export function shownRectangles(capture: BboxCapture): readonly Bbox[] {
  const { bbox, drawing } = capture
  const captured = bbox === undefined ? [] : [bbox]
  if (drawing.kind !== 'dragging') return captured
  return [...captured, bboxBetween(drawing.start.position, drawing.current.position)]
}
