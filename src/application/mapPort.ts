import type { Bbox } from '../domain/bbox'
import type { DrawEvent } from '../domain/bboxCapture'
import type { Destination } from '../domain/destination'
import type { RasterTiles } from '../domain/rasterTiles'
import type { MapView } from '../domain/mapView'
import type { WmsTileLayer } from '../domain/wmsTiles'

/** What the application needs from a map to show a basemap. */
export interface BasemapDisplay {
  /** Draws `tiles` as the basemap, in place of the one drawn before, keeping the view. */
  showBasemap(tiles: RasterTiles): void
}

/** What the application needs from a map to follow what it shows. */
export interface ViewSource {
  /** Calls `listener` each time the visible view changes. Returns the function that stops it. */
  onViewChange(listener: (view: MapView) => void): () => void
}

/** What the application needs from a map to capture a bbox on it. */
export interface DrawingSurface {
  /**
   * Turns the drawing mode of the map on or off. While it is on, the map shows a
   * crosshair cursor, a drag on it does not move it, and each press of the
   * pointer on it, each move and release of the pointer, even off the map, and
   * Escape, are reported to `onDraw` listeners.
   */
  setDrawingMode(on: boolean): void
  /** Calls `listener` with each draw event. Returns the function that stops it. */
  onDraw(listener: (event: DrawEvent) => void): () => void
  /** Draws `rectangles` over the basemap, in place of those drawn before. */
  showRectangles(rectangles: readonly Bbox[]): void
}

/** What the application needs from a map to move it to a place. */
export interface MapNavigation {
  /** Moves the map to show `destination`: its extent, or its view. */
  goTo(destination: Destination): void
}

/** What the application needs from a map to draw WMS layers over its basemap. */
export interface LayerDisplay {
  /**
   * Draws `layers` over the basemap and under the rectangles, the first one on
   * top, in place of those drawn before. A layer drawn before keeps its tiles.
   */
  showLayers(layers: readonly WmsTileLayer[]): void
}

/** What the application needs from a map to credit what it draws. */
export interface CreditDisplay {
  /** Shows `credits` as the map's attribution, as they are written, in place of those shown before. */
  showCredits(credits: string): void
}

/**
 * A part of the application that uses one `Port` at a time: from `connect`
 * until `disconnect`, or until another port is connected.
 */
export interface Connectable<Port> {
  connect(port: Port): void
  disconnect(): void
}

/**
 * What the application needs from a map. The MapLibre adapter implements it;
 * unit and acceptance tests replace it with a fake.
 */
export interface MapPort
  extends BasemapDisplay, ViewSource, DrawingSurface, MapNavigation, LayerDisplay, CreditDisplay {
  /** Releases the map and everything it holds. */
  destroy(): void
}
