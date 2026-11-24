# QA procedure: layer zoom

Feature: the zoom button of a layer, "Zoomer sur <title>", makes the map
show the extent the server declares for the layer. It neither shows nor
hides the layer. It is disabled when the server declares no extent.

Settings, controls and recorded documents: see `layer-panel.md`. The view
indicator is at the bottom left of the map. When it is said to read a
centre and a zoom, wait until it stops changing.

## layer-zoom 1: the zoom button shows the extent the server declares for the layer

Run the steps once for each row of the table.

1. Open the application.
2. Press "Zoomer sur <title>" for the layer of the row.
3. Expect the view indicator to show a centre and a zoom within the ranges
   of the row: the declared extent fills the map.

| Layer | Declared extent            | Centre                                   | Zoom       |
|-------|----------------------------|------------------------------------------|------------|
| 1     | -9.88, 40.58, 11.68, 51.44 | 46.0° N to 46.6° N, 0.6° E to 1.2° E     | 4.4 to 5.0 |
| 2     | -5.50, 41.33, 10.81, 51.09 | 46.1° N to 46.6° N, 2.4° E to 2.9° E     | 4.6 to 5.2 |
| 3     | 3.33, 44.07, 14.28, 49.20  | 46.5° N to 46.9° N, 8.6° E to 9.0° E     | 5.5 to 6.1 |

## layer-zoom 2: the zoom button neither shows nor hides the layer

1. Open the application. Show layer 1.
2. Press "Zoomer sur Carte lithologique simplifiée au 1/1 000 000".
3. Expect the eye button of layer 1 to still be pressed, and the ones of
   layers 2 and 3 not to be. Expect no GetMap request of layer 2.
4. Show layer 2. Press its zoom button again. Expect its eye button to still
   be pressed.

## layer-zoom 3: the zoom button is disabled when the server declares no extent

The BRGM's recorded capabilities document has neither an
`EX_GeographicBoundingBox` nor a `BoundingBox` for its layer, nor for any
layer above it.

1. Open the application.
2. Expect "Zoomer sur Carte lithologique simplifiée au 1/1 000 000" to be
   disabled, and the other controls of layer 2 to be enabled.
3. Expect the zoom buttons of layers 1 and 3 to be enabled.
