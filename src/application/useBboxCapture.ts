import { computed, shallowRef, type ComputedRef } from 'vue'

import { describeBbox } from '../domain/bbox'
import {
  applyDrawEvent,
  clearBbox as withoutBbox,
  INITIAL_BBOX_CAPTURE,
  isDrawingModeOn,
  shownRectangles,
  toggleDrawing as withDrawingToggled,
  type BboxCapture,
} from '../domain/bboxCapture'
import type { DrawingSurface } from './mapPort'

export interface BboxCaptureState {
  /** The text of the bbox panel. */
  readonly bboxText: ComputedRef<string>
  readonly canClear: ComputedRef<boolean>
  readonly drawingMode: ComputedRef<boolean>
  /** What the drawing button does. */
  toggleDrawing(): void
  clearBbox(): void
  /** Draws on `surface` and follows what the user does on it, until `disconnect` or another surface is connected. */
  connect(surface: DrawingSurface): void
  disconnect(): void
}

export function useBboxCapture(): BboxCaptureState {
  const capture = shallowRef<BboxCapture>(INITIAL_BBOX_CAPTURE)
  const bboxText = computed(() => describeBbox(capture.value.bbox))
  const canClear = computed(() => capture.value.bbox !== undefined)
  const drawingMode = computed(() => isDrawingModeOn(capture.value))
  let surface: DrawingSurface | undefined
  let stopListening: (() => void) | undefined

  function update(next: BboxCapture): void {
    const previous = capture.value
    if (next === previous) return
    capture.value = next
    if (isDrawingModeOn(next) !== isDrawingModeOn(previous)) surface?.setDrawingMode(isDrawingModeOn(next))
    surface?.showRectangles(shownRectangles(next))
  }

  function disconnect(): void {
    stopListening?.()
    stopListening = undefined
    surface = undefined
  }

  function connect(next: DrawingSurface): void {
    disconnect()
    surface = next
    stopListening = next.onDraw((event) => update(applyDrawEvent(capture.value, event)))
    next.setDrawingMode(isDrawingModeOn(capture.value))
    next.showRectangles(shownRectangles(capture.value))
  }

  return {
    bboxText,
    canClear,
    drawingMode,
    toggleDrawing: () => update(withDrawingToggled(capture.value)),
    clearBbox: () => update(withoutBbox(capture.value)),
    connect,
    disconnect,
  }
}
