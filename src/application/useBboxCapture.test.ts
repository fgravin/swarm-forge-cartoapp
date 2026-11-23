import { describe, expect, it } from 'vitest'

import { bboxBetween, type Bbox } from '../domain/bbox'
import type { DrawEvent, MapPointer } from '../domain/bboxCapture'
import type { DrawingSurface } from './mapPort'
import { useBboxCapture } from './useBboxCapture'

function fakeSurface() {
  const listeners = new Set<(event: DrawEvent) => void>()
  const drawingModes: boolean[] = []
  const shown: (readonly Bbox[])[] = []
  const surface: DrawingSurface = {
    setDrawingMode(on) {
      drawingModes.push(on)
    },
    onDraw(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    showRectangles(rectangles) {
      shown.push(rectangles)
    },
  }
  return {
    surface,
    drawingModes,
    rectangles: () => shown.at(-1),
    rectanglesShownCount: () => shown.length,
    user: (...events: readonly DrawEvent[]) => events.forEach((event) => listeners.forEach((listener) => listener(event))),
  }
}

function at(x: number, y: number): MapPointer {
  return { point: { x, y }, position: { lng: x / 100, lat: -y / 100 } }
}

function dragEvents(from: MapPointer, to: MapPointer): readonly DrawEvent[] {
  return [
    { type: 'press', pointer: from },
    { type: 'move', pointer: to },
    { type: 'release', pointer: to },
  ]
}

describe('useBboxCapture', () => {
  it('starts without a bbox, with nothing to clear, and the drawing mode off', () => {
    const capture = useBboxCapture()

    expect(capture.bboxText.value).toBe('Aucune emprise')
    expect(capture.canClear.value).toBe(false)
    expect(capture.drawingMode.value).toBe(false)
  })

  it('tells a connected map the drawing mode and the rectangles to show', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()

    capture.connect(map.surface)

    expect(map.drawingModes).toEqual([false])
    expect(map.rectangles()).toEqual([])
  })

  it('turns the drawing mode on and off with the drawing button, and tells the map', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(map.surface)

    capture.toggleDrawing()
    expect(capture.drawingMode.value).toBe(true)
    capture.toggleDrawing()

    expect(capture.drawingMode.value).toBe(false)
    expect(map.drawingModes).toEqual([false, true, false])
  })

  it('shows the rectangle being drawn on the map as the pointer moves, without capturing it yet', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(map.surface)
    capture.toggleDrawing()

    map.user({ type: 'press', pointer: at(10, 10) }, { type: 'move', pointer: at(90, 50) })

    expect(map.rectangles()).toEqual([bboxBetween(at(10, 10).position, at(90, 50).position)])
    expect(capture.bboxText.value).toBe('Aucune emprise')
    expect(map.drawingModes).toEqual([false, true])
  })

  it('captures the dragged rectangle as the bbox, offers to clear it, and ends the drawing mode', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(map.surface)
    capture.toggleDrawing()

    map.user(...dragEvents({ point: { x: 0, y: 0 }, position: { lng: 5.71234, lat: 45.56789 } }, {
      point: { x: 300, y: 400 },
      position: { lng: 6.01234, lat: 45.12345 },
    }))

    expect(capture.bboxText.value).toBe('5.71234, 45.12345, 6.01234, 45.56789')
    expect(capture.canClear.value).toBe(true)
    expect(capture.drawingMode.value).toBe(false)
    expect(map.drawingModes).toEqual([false, true, false])
    expect(map.rectangles()).toEqual([[5.71234, 45.12345, 6.01234, 45.56789]])
  })

  it('clears the bbox and its rectangle', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(map.surface)
    capture.toggleDrawing()
    map.user(...dragEvents(at(10, 10), at(90, 90)))

    capture.clearBbox()

    expect(capture.bboxText.value).toBe('Aucune emprise')
    expect(capture.canClear.value).toBe(false)
    expect(map.rectangles()).toEqual([])
  })

  it('does not tell the map anything when nothing changes', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(map.surface)

    map.user(...dragEvents(at(10, 10), at(90, 90)))
    capture.clearBbox()

    expect(map.drawingModes).toEqual([false])
    expect(map.rectanglesShownCount()).toBe(1)
  })

  it('keeps its state without a map, and shows it on the map connected next', () => {
    const capture = useBboxCapture()
    capture.toggleDrawing()
    const map = fakeSurface()

    capture.connect(map.surface)

    expect(map.drawingModes).toEqual([true])
  })

  it('stops listening to and drawing on a map once disconnected', () => {
    const map = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(map.surface)
    capture.toggleDrawing()

    capture.disconnect()
    map.user(...dragEvents(at(10, 10), at(90, 90)))
    capture.toggleDrawing()

    expect(capture.bboxText.value).toBe('Aucune emprise')
    expect(map.drawingModes).toEqual([false, true])
  })

  it('leaves the previous map when another one is connected, and shows the bbox on the new one', () => {
    const first = fakeSurface()
    const second = fakeSurface()
    const capture = useBboxCapture()
    capture.connect(first.surface)
    capture.toggleDrawing()
    first.user(...dragEvents(at(10, 10), at(90, 90)))

    capture.connect(second.surface)
    first.user({ type: 'press', pointer: at(200, 200) })
    capture.toggleDrawing()

    expect(second.rectangles()).toEqual([bboxBetween(at(10, 10).position, at(90, 90).position)])
    expect(second.drawingModes).toEqual([false, true])
    expect(first.drawingModes).toEqual([false, true, false])
  })
})
