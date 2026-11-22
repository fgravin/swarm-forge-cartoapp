# QA procedure: bbox georeference

Feature: a bbox is a place on the Earth, not on the screen; moving or zooming
the map, or changing its basemap, leaves the bbox and its rectangle where they
were.

Every step is done in the browser, on the built application. Requests to tile
servers are answered locally with blank tiles, so the only thing drawn on the
map is the bbox rectangle: compare pictures of the map to see it. See
`bbox-drawing-mode.md` for the controls, C, and how to drag.

## bbox-georeference 1: moving and zooming the map keeps the bbox in place

1. Open the application.
2. Click "Dessiner une emprise" and drag on the map from C-(100,100) to
   C+(100,100). Note the text of the "Emprise" panel.
3. Press the "Zoom in" button of the map and wait until the view indicator
   ends with `zoom 6.0`.
4. Expect the "Emprise" panel to read the text noted at step 2, and the
   rectangle to have doubled in size around C: its edges are now about 200
   pixels from C.
5. Drag on the map from C to C+(150,0) and wait until the view indicator
   stops changing.
6. Expect the "Emprise" panel to read the text noted at step 2, and the
   rectangle to have moved with the map: it is now centred about 150 pixels
   right of C.

## bbox-georeference 2: changing the basemap keeps the bbox

1. Open the application.
2. Click "Dessiner une emprise" and drag on the map from C-(100,100) to
   C+(100,100). Note the text of the "Emprise" panel, and take a picture of
   the map.
3. In the "Fonds de plan" panel, choose "World Imagery". Wait until the map
   has requested World Imagery tiles.
4. Expect the "Emprise" panel to read the text noted at step 2, and the map
   to look like the picture of step 2: the rectangle is still shown, at the
   same place.
5. Choose "Positron" again, and expect the same as at step 4.
